import { internal } from "./_generated/api";
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type ImportedBundle = {
  version?: number;
  courses?: Array<{
    name?: string;
    color?: "white" | "black";
    description?: string | null;
    sourceCourseId?: string;
    sourceUrl?: string;
    chapters?: Array<{
      name?: string;
      chapterType?: "training" | "info_only";
      sortOrder?: number;
      description?: string | null;
      sourceChapterId?: string;
      sourceFile?: string;
      moves?: Array<{
        parentFen?: string;
        childFen?: string;
        san?: string;
        uci?: string;
        moveNumber?: number;
        colorToMove?: "white" | "black";
        isMainLine?: boolean;
        moveType?: "repertoire" | "opponent" | "alternative";
        sortOrder?: number;
        comment?: string | null;
        annotations?: ImportedAnnotations;
      }>;
    }>;
  }>;
  positions?: Array<{ fen?: string; annotation?: string | null }>;
};

type ImportedAnnotations = {
  nags?: number[];
  directives?: Array<{
    name: string;
    args: Record<string, string>;
    value?: string;
    raw: string;
  }>;
  arrows?: Array<{ start: string; end: string; color?: string; raw?: string }>;
  circles?: Array<{ square: string; color?: string; raw?: string }>;
  clocks?: string[];
};

/**
 * A duplicate parent+SAN edge can be encountered when several PGN lines
 * converge on the same position.  Moves are represented by one Convex row,
 * so merge all metadata from the duplicate instead of silently dropping the
 * later line's comment, NAGs, drawings, or clock directives.
 */
type MoveMetadata = Pick<Doc<"moves">, "comment" | "annotations" | "isMainLine">;

function mergeText(existing?: string, incoming?: string) {
  const left = existing?.trim();
  const right = incoming?.trim();
  if (!right) return existing;
  if (!left) return incoming;
  if (left === right) return existing;
  return `${existing}\n\n${incoming}`;
}

function mergeUnique<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const item of items) {
    const itemKey = key(item);
    if (seen.has(itemKey)) continue;
    seen.add(itemKey);
    merged.push(item);
  }
  return merged;
}

function mergeAnnotations(
  existing?: ImportedAnnotations | Doc<"moves">["annotations"],
  incoming?: ImportedAnnotations,
): ImportedAnnotations | undefined {
  if (!existing && !incoming) return undefined;
  const current = existing as ImportedAnnotations | undefined;
  const merged: ImportedAnnotations = {};

  const nags = mergeUnique([...(current?.nags ?? []), ...(incoming?.nags ?? [])], String);
  if (nags.length > 0) merged.nags = nags;

  const directives = mergeUnique(
    [...(current?.directives ?? []), ...(incoming?.directives ?? [])],
    (directive) => directive.raw,
  );
  if (directives.length > 0) merged.directives = directives;

  const arrows = mergeUnique(
    [...(current?.arrows ?? []), ...(incoming?.arrows ?? [])],
    (arrow) => `${arrow.start}:${arrow.end}:${arrow.color ?? ""}:${arrow.raw ?? ""}`,
  );
  if (arrows.length > 0) merged.arrows = arrows;

  const circles = mergeUnique(
    [...(current?.circles ?? []), ...(incoming?.circles ?? [])],
    (circle) => `${circle.square}:${circle.color ?? ""}:${circle.raw ?? ""}`,
  );
  if (circles.length > 0) merged.circles = circles;

  const clocks = mergeUnique([...(current?.clocks ?? []), ...(incoming?.clocks ?? [])], String);
  if (clocks.length > 0) merged.clocks = clocks;

  return merged;
}

async function mergeDuplicateMove(
  ctx: MutationCtx,
  existing: MoveMetadata & Pick<Doc<"moves">, "_id">,
  incoming: {
    comment?: string;
    annotations?: ImportedAnnotations;
    isMainLine: boolean;
  },
) {
  const comment = mergeText(existing.comment, incoming.comment);
  const annotations = mergeAnnotations(existing.annotations, incoming.annotations);
  const patch: {
    comment?: string;
    annotations?: ImportedAnnotations;
    isMainLine?: boolean;
  } = {};
  if (comment && comment !== existing.comment) patch.comment = comment;
  if (annotations && JSON.stringify(annotations) !== JSON.stringify(existing.annotations ?? undefined)) {
    patch.annotations = annotations;
  }
  if (incoming.isMainLine && !existing.isMainLine) patch.isMainLine = true;
  if (Object.keys(patch).length > 0) {
    // Keep the in-memory entry in sync as more duplicate lines converge on
    // this edge later in the same mutation/batch.  Otherwise a third line
    // would merge against stale metadata and overwrite the second line's
    // contribution in the database.
    if (patch.comment !== undefined) existing.comment = patch.comment;
    if (patch.annotations !== undefined) existing.annotations = patch.annotations;
    if (patch.isMainLine !== undefined) existing.isMainLine = patch.isMainLine;
    await ctx.db.patch(existing._id, patch);
  }
}

const pgnArrowValidator = v.object({
  start: v.string(),
  end: v.string(),
  color: v.optional(v.string()),
  raw: v.optional(v.string()),
});

const pgnCircleValidator = v.object({
  square: v.string(),
  color: v.optional(v.string()),
  raw: v.optional(v.string()),
});

const pgnDirectiveValidator = v.object({
  name: v.string(),
  args: v.record(v.string(), v.string()),
  value: v.optional(v.string()),
  raw: v.string(),
});

const pgnAnnotationsValidator = v.object({
  nags: v.optional(v.array(v.number())),
  directives: v.optional(v.array(pgnDirectiveValidator)),
  arrows: v.optional(v.array(pgnArrowValidator)),
  circles: v.optional(v.array(pgnCircleValidator)),
  clocks: v.optional(v.array(v.string())),
});

/**
 * Import pre-parsed moves into a chapter.
 * The PGN parsing and tree building happens on the Next.js side (using chess.js),
 * and then this mutation stores the results into Convex.
 */
export const importTreeIntoChapter = mutation({
  args: {
    courseId: v.id("courses"),
    chapterName: v.string(),
    chapterType: v.optional(v.union(v.literal("training"), v.literal("info_only"))),
    sortOrder: v.number(),
    courseColor: v.union(v.literal("white"), v.literal("black")),
    rootFen: v.string(),
    moves: v.array(
      v.object({
        parentFen: v.string(),
        fen: v.string(),
        san: v.string(),
        uci: v.string(),
        moveNumber: v.number(),
        colorToMove: v.union(v.literal("white"), v.literal("black")),
        comment: v.optional(v.string()),
        isMainLine: v.boolean(),
        annotations: v.optional(pgnAnnotationsValidator),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Verify ownership
    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== userId) throw new Error("Course not found");

    // Create chapter
    const chapterId = await ctx.db.insert("chapters", {
      courseId: args.courseId,
      name: args.chapterName,
      chapterType: args.chapterType ?? "training",
      sortOrder: args.sortOrder,
      createdAt: Date.now(),
    });

    // Pre-collect annotations per FEN so the cache below can't lose them.
    const annotationsByFen = new Map<string, string>();
    for (const mv of args.moves) {
      if (mv.comment && !annotationsByFen.has(mv.fen)) {
        annotationsByFen.set(mv.fen, mv.comment);
      }
    }

    // Upsert positions and create moves
    const fenToId = new Map<string, Id<"positions">>();

    async function upsertPosition(fen: string): Promise<Id<"positions">> {
      const cached = fenToId.get(fen);
      if (cached) return cached;

      const annotation = annotationsByFen.get(fen);

      const existing = await ctx.db
        .query("positions")
        .withIndex("by_user_fen", (q) => q.eq("userId", userId!).eq("fen", fen))
        .first();

      if (existing) {
        if (annotation && !existing.annotation) {
          await ctx.db.patch(existing._id, { annotation });
        }
        const existingId = existing._id as Id<"positions">;
        fenToId.set(fen, existingId);
        return existingId;
      }

      const id = await ctx.db.insert("positions", {
        userId: userId!,
        fen,
        annotation,
      });
      fenToId.set(fen, id);
      return id;
    }

    // Ensure root position exists
    await upsertPosition(args.rootFen);

    // Chapter was just created in this mutation, so we only need to dedup
    // against moves we insert in this same loop. Track in memory.
    const seenMoves = new Map<string, MoveMetadata & Pick<Doc<"moves">, "_id">>();
    let movesCreated = 0;
    let movesSkipped = 0;

    for (const [index, mv] of args.moves.entries()) {
      const parentId = await upsertPosition(mv.parentFen);
      const childId = await upsertPosition(mv.fen);

      const dupKey = `${parentId}:${mv.san}`;
      const existingMove = seenMoves.get(dupKey);
      if (existingMove) {
        await mergeDuplicateMove(ctx, existingMove, mv);
        movesSkipped++;
        continue;
      }

      // Determine move type: whose move is this?
      const colorThatMoved: "white" | "black" =
        mv.colorToMove === "white" ? "black" : "white";
      const moveType =
        colorThatMoved === args.courseColor ? "repertoire" : "opponent";

      const moveId = await ctx.db.insert("moves", {
        chapterId,
        parentPositionId: parentId,
        childPositionId: childId,
        san: mv.san,
        uci: mv.uci,
        moveNumber: mv.moveNumber,
        colorToMove: mv.colorToMove,
        isMainLine: mv.isMainLine,
        moveType,
        sortOrder: index,
        ...(mv.comment ? { comment: mv.comment } : {}),
        ...(mv.annotations ? { annotations: mv.annotations } : {}),
      });
      seenMoves.set(dupKey, {
        _id: moveId,
        comment: mv.comment,
        annotations: mv.annotations,
        isMainLine: mv.isMainLine,
      });
      movesCreated++;
    }

    return { chapterId, movesCreated, movesSkipped };
  },
});

const importMoveValidator = v.object({
  parentFen: v.string(),
  fen: v.string(),
  san: v.string(),
  uci: v.string(),
  moveNumber: v.number(),
  colorToMove: v.union(v.literal("white"), v.literal("black")),
  comment: v.optional(v.string()),
  isMainLine: v.boolean(),
  annotations: v.optional(pgnAnnotationsValidator),
});

const MOVE_CHUNK_SIZE = 250;

function chunkMoves<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const listCourseImports = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== userId) return [];

    const imports = await ctx.db
      .query("courseImports")
      .withIndex("by_course_and_created_at", (q) => q.eq("courseId", args.courseId))
      .order("desc")
      // Archive imports are intentionally enqueued one chapter at a time to
      // stay below Convex's function payload ceiling.  Keep enough recent
      // rows to report the full archive rather than only the last five.
      .take(50);

    const items = [];
    for (const item of imports) {
      const chapters = await ctx.db
        .query("courseImportChapters")
        .withIndex("by_import_and_sort_order", (q) => q.eq("importId", item._id))
        .order("asc")
        .collect();
      items.push({
        ...item,
        chapters: chapters.map((ch) => ({
          _id: ch._id,
          chapterName: ch.chapterName,
          chapterType: ch.chapterType,
          sourceChapterId: ch.sourceChapterId ?? null,
          sourceFile: ch.sourceFile ?? null,
          status: ch.status,
          totalMoves: ch.totalMoves,
          processedMoves: ch.processedMoves,
          createdChapterId: ch.createdChapterId ?? null,
          error: ch.error ?? null,
        })),
      });
    }
    return items;
  },
});

export const createCourseImport = mutation({
  args: {
    courseId: v.id("courses"),
    chapters: v.array(
      v.object({
        chapterName: v.string(),
        chapterType: v.union(v.literal("training"), v.literal("info_only")),
        sortOrder: v.number(),
        courseColor: v.union(v.literal("white"), v.literal("black")),
        rootFen: v.string(),
        sourceChapterId: v.optional(v.string()),
        sourceFile: v.optional(v.string()),
        moves: v.array(importMoveValidator),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== userId) throw new Error("Course not found");
    if (args.chapters.length === 0) throw new Error("No chapters to import");

    // A source chapter id is a stable idempotency key for archive imports.
    // Concurrent/retried requests should not create another chapter (or a
    // second background job) once the first request has committed its row.
    const chaptersToQueue = [];
    const sourceChapterIdsSeen = new Set<string>();
    for (const chapter of args.chapters) {
      if (!chapter.sourceChapterId) {
        chaptersToQueue.push(chapter);
        continue;
      }
      if (sourceChapterIdsSeen.has(chapter.sourceChapterId)) continue;
      sourceChapterIdsSeen.add(chapter.sourceChapterId);
      const existing = await ctx.db
        .query("courseImportChapters")
        .withIndex("by_course_and_source_chapter_id", (q) =>
          q.eq("courseId", args.courseId).eq("sourceChapterId", chapter.sourceChapterId!),
        )
        .first();
      if (!existing) chaptersToQueue.push(chapter);
    }

    if (chaptersToQueue.length === 0) {
      const existingImport = await ctx.db
        .query("courseImports")
        .withIndex("by_course_and_created_at", (q) => q.eq("courseId", args.courseId))
        .order("desc")
        .first();
      if (!existingImport) throw new Error("Import already exists but its progress row is missing");
      return existingImport._id;
    }

    const now = Date.now();
    const importId = await ctx.db.insert("courseImports", {
      courseId: args.courseId,
      userId,
      status: "queued",
      totalChapters: chaptersToQueue.length,
      completedChapters: 0,
      failedChapters: 0,
      createdAt: now,
      updatedAt: now,
    });

    for (const chapter of chaptersToQueue) {
      const chapterImportId = await ctx.db.insert("courseImportChapters", {
        importId,
        courseId: args.courseId,
        userId,
        chapterName: chapter.chapterName,
        chapterType: chapter.chapterType,
        sortOrder: chapter.sortOrder,
        courseColor: chapter.courseColor,
        rootFen: chapter.rootFen,
        ...(chapter.sourceChapterId ? { sourceChapterId: chapter.sourceChapterId } : {}),
        ...(chapter.sourceFile ? { sourceFile: chapter.sourceFile } : {}),
        status: "queued",
        totalMoves: chapter.moves.length,
        processedMoves: 0,
        moveChunkCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      const chunks = chunkMoves(chapter.moves, MOVE_CHUNK_SIZE);
      for (const [chunkIndex, chunk] of chunks.entries()) {
        await ctx.db.insert("courseImportMoveChunks", {
          chapterImportId,
          chunkIndex,
          moves: chunk,
          createdAt: now,
        });
      }
      await ctx.db.patch(chapterImportId, {
        moveChunkCount: chunks.length,
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAfter(0, internal.import.processImportChapterBatch, {
        chapterImportId,
        offset: 0,
      });
    }
    return importId;
  },
});

async function refreshImportStatus(ctx: MutationCtx, importId: Id<"courseImports">) {
  const chapters = await ctx.db
    .query("courseImportChapters")
    .withIndex("by_import_and_sort_order", (q) => q.eq("importId", importId))
    .collect();
  const completed = chapters.filter((c) => c.status === "done").length;
  const failed = chapters.filter((c) => c.status === "failed").length;
  const hasProcessing = chapters.some((c) => c.status === "processing");
  const hasQueued = chapters.some((c) => c.status === "queued");
  const status = failed > 0
    ? (completed + failed === chapters.length ? "failed" : "processing")
    : hasProcessing || hasQueued
      ? "processing"
      : "done";

  await ctx.db.patch(importId, {
    completedChapters: completed,
    failedChapters: failed,
    status,
    updatedAt: Date.now(),
  });
}

export const processImportChapterBatch = internalMutation({
  args: {
    chapterImportId: v.id("courseImportChapters"),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    const chapterImport = await ctx.db.get(args.chapterImportId);
    if (!chapterImport) return;
    if (chapterImport.status === "done" || chapterImport.status === "failed") return;

    const BATCH_SIZE = 120;
    const importId = chapterImport.importId;
    const importUserId = chapterImport.userId;
    const courseColor = chapterImport.courseColor;
    const totalMoves = chapterImport.totalMoves;
    if (totalMoves === 0) {
      await ctx.db.patch(chapterImport._id, {
        status: "done",
        processedMoves: 0,
        updatedAt: Date.now(),
      });
      await refreshImportStatus(ctx, importId);
      return;
    }
    const startChunkIndex = Math.floor(args.offset / MOVE_CHUNK_SIZE);
    const endChunkIndex = Math.floor((Math.min(args.offset + BATCH_SIZE, totalMoves) - 1) / MOVE_CHUNK_SIZE);
    const chunkDocs = await ctx.db
      .query("courseImportMoveChunks")
      .withIndex("by_chapter_import_and_chunk_index", (q) =>
        q
          .eq("chapterImportId", chapterImport._id)
          .gte("chunkIndex", startChunkIndex)
          .lte("chunkIndex", endChunkIndex),
      )
      .collect();
    const chunkMap = new Map(chunkDocs.map((d) => [d.chunkIndex, d.moves]));
    const moves = [];
    const batchEnd = Math.min(args.offset + BATCH_SIZE, totalMoves);
    for (let i = args.offset; i < batchEnd; i++) {
      const chunkIndex = Math.floor(i / MOVE_CHUNK_SIZE);
      const inChunkIndex = i % MOVE_CHUNK_SIZE;
      const chunk = chunkMap.get(chunkIndex);
      if (!chunk || !chunk[inChunkIndex]) {
        await ctx.db.patch(chapterImport._id, {
          status: "failed",
          error: "Import chunk is missing",
          updatedAt: Date.now(),
        });
        await refreshImportStatus(ctx, importId);
        return;
      }
      moves.push(chunk[inChunkIndex]);
    }

    if (args.offset === 0 && chapterImport.status === "queued") {
      await ctx.db.patch(chapterImport._id, { status: "processing", updatedAt: Date.now() });
      await ctx.db.patch(importId, { status: "processing", updatedAt: Date.now() });
    }

    const course = await ctx.db.get(chapterImport.courseId);
    if (!course || course.userId !== chapterImport.userId) {
      await ctx.db.patch(chapterImport._id, {
        status: "failed",
        error: "Course not found",
        updatedAt: Date.now(),
      });
      await refreshImportStatus(ctx, importId);
      return;
    }

    let chapterId = chapterImport.createdChapterId;
    if (!chapterId) {
      chapterId = await ctx.db.insert("chapters", {
        courseId: chapterImport.courseId,
        name: chapterImport.chapterName,
        chapterType: chapterImport.chapterType,
        sortOrder: chapterImport.sortOrder,
        ...(chapterImport.sourceChapterId ? { sourceChapterId: chapterImport.sourceChapterId } : {}),
        ...(chapterImport.sourceFile ? { sourceFile: chapterImport.sourceFile } : {}),
        createdAt: Date.now(),
      });
      await ctx.db.patch(chapterImport._id, { createdChapterId: chapterId, updatedAt: Date.now() });
    }

    const annotationsByFen = new Map<string, string>();
    for (const mv of moves) {
      if (mv.comment && !annotationsByFen.has(mv.fen)) annotationsByFen.set(mv.fen, mv.comment);
    }

    const batch = moves;
    const fensInBatch = new Set<string>([chapterImport.rootFen]);
    for (const mv of batch) {
      fensInBatch.add(mv.parentFen);
      fensInBatch.add(mv.fen);
    }

    const fenToId = new Map<string, Id<"positions">>();
    for (const fen of fensInBatch) {
      const existing = await ctx.db
        .query("positions")
        .withIndex("by_user_fen", (q) => q.eq("userId", importUserId).eq("fen", fen))
        // Legacy imports may already contain duplicate position rows.  A
        // retry should reuse one deterministically instead of throwing from
        // `.unique()` and leaving the chapter stuck in processing.
        .first();
      if (existing) {
        if (annotationsByFen.has(fen) && !existing.annotation) {
          await ctx.db.patch(existing._id, { annotation: annotationsByFen.get(fen) });
        }
        fenToId.set(fen, existing._id as Id<"positions">);
      }
    }

    async function ensurePosition(fen: string): Promise<Id<"positions">> {
      const cached = fenToId.get(fen);
      if (cached) return cached;
      const id = await ctx.db.insert("positions", {
        userId: importUserId,
        fen,
        annotation: annotationsByFen.get(fen),
      });
      fenToId.set(fen, id);
      return id;
    }

    await ensurePosition(chapterImport.rootFen);

    const existingMoves = await ctx.db
      .query("moves")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapterId))
      .collect();
    const seenMoves = new Map<string, MoveMetadata & Pick<Doc<"moves">, "_id">>();
    for (const existingMove of existingMoves) {
      seenMoves.set(`${existingMove.parentPositionId}:${existingMove.san}`, {
        _id: existingMove._id,
        comment: existingMove.comment,
        annotations: existingMove.annotations,
        isMainLine: existingMove.isMainLine,
      });
    }

    for (const [i, mv] of batch.entries()) {
      const parentId = await ensurePosition(mv.parentFen);
      const childId = await ensurePosition(mv.fen);
      const dupKey = `${parentId}:${mv.san}`;
      const existingMove = seenMoves.get(dupKey);
      if (existingMove) {
        await mergeDuplicateMove(ctx, existingMove, mv);
        continue;
      }
      const colorThatMoved: "white" | "black" = mv.colorToMove === "white" ? "black" : "white";
      const moveType = colorThatMoved === courseColor ? "repertoire" : "opponent";
      const moveId = await ctx.db.insert("moves", {
        chapterId,
        parentPositionId: parentId,
        childPositionId: childId,
        san: mv.san,
        uci: mv.uci,
        moveNumber: mv.moveNumber,
        colorToMove: mv.colorToMove,
        isMainLine: mv.isMainLine,
        moveType,
        sortOrder: args.offset + i,
        ...(mv.comment ? { comment: mv.comment } : {}),
        ...(mv.annotations ? { annotations: mv.annotations } : {}),
      });
      seenMoves.set(dupKey, {
        _id: moveId,
        comment: mv.comment,
        annotations: mv.annotations,
        isMainLine: mv.isMainLine,
      });
    }

    const newOffset = args.offset + batch.length;
    if (newOffset >= totalMoves) {
      await ctx.db.patch(chapterImport._id, {
        status: "done",
        processedMoves: totalMoves,
        updatedAt: Date.now(),
      });
      await refreshImportStatus(ctx, importId);
      return;
    }

    await ctx.db.patch(chapterImport._id, {
      status: "processing",
      processedMoves: newOffset,
      updatedAt: Date.now(),
    });
    await refreshImportStatus(ctx, importId);
    await ctx.scheduler.runAfter(0, internal.import.processImportChapterBatch, {
      chapterImportId: chapterImport._id,
      offset: newOffset,
    });
  },
});

/** Get the tree data for a course (all chapters, moves, positions) */
export const getCourseTree = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== userId) throw new Error("Not found");

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const moves = [];
    for (const ch of chapters) {
      const chMoves = await ctx.db
        .query("moves")
        .withIndex("by_chapter", (q) => q.eq("chapterId", ch._id))
        .collect();
      moves.push(...chMoves);
    }

    const posIds = new Set<string>();
    for (const m of moves) {
      posIds.add(m.parentPositionId as string);
      posIds.add(m.childPositionId as string);
    }
    const positions = [];
    for (const id of posIds) {
      const pos = await ctx.db.get(id as Id<"positions">);
      if (pos) positions.push(pos);
    }

    return { course, chapters, moves, positions };
  },
});

export const importBundle = mutation({
  args: { bundle: v.any() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const authedUserId = userId;

    const bundle = args.bundle as ImportedBundle;
    if (bundle.version !== 1 || !Array.isArray(bundle.courses)) {
      throw new Error("Unsupported bundle");
    }

    const annotations = new Map<string, string>();
    for (const position of bundle.positions ?? []) {
      if (position.fen && position.annotation) {
        annotations.set(position.fen, position.annotation);
      }
    }

    const fenToId = new Map<string, Id<"positions">>();
    async function upsertPosition(fen: string): Promise<Id<"positions">> {
      const cached = fenToId.get(fen);
      if (cached) return cached;

      const existing = await ctx.db
        .query("positions")
        .withIndex("by_user_fen", (q) => q.eq("userId", authedUserId).eq("fen", fen))
        .first();
      if (existing) {
        const annotation = annotations.get(fen);
        if (annotation && !existing.annotation) {
          await ctx.db.patch(existing._id, { annotation });
        }
        const existingId = existing._id as Id<"positions">;
        fenToId.set(fen, existingId);
        return existingId;
      }

      const id = await ctx.db.insert("positions", {
        userId: authedUserId,
        fen,
        annotation: annotations.get(fen),
      });
      fenToId.set(fen, id);
      return id;
    }

    let coursesCreated = 0;
    let chaptersCreated = 0;
    let movesCreated = 0;

    for (const course of bundle.courses) {
      if (!course.name || (course.color !== "white" && course.color !== "black")) continue;
      const now = Date.now();
      const courseId = await ctx.db.insert("courses", {
        userId: authedUserId,
        name: course.name,
        color: course.color,
        description: course.description ?? undefined,
        ...(course.sourceCourseId ? { sourceCourseId: course.sourceCourseId } : {}),
        ...(course.sourceUrl ? { sourceUrl: course.sourceUrl } : {}),
        isPublic: false,
        createdAt: now,
        updatedAt: now,
      });
      coursesCreated++;

      for (const [chapterIndex, chapter] of (course.chapters ?? []).entries()) {
        const chapterId = await ctx.db.insert("chapters", {
          courseId,
          name: chapter.name || `Chapter ${chapterIndex + 1}`,
          chapterType: chapter.chapterType ?? "training",
          sortOrder: chapter.sortOrder ?? chapterIndex,
          description: chapter.description ?? undefined,
          ...(chapter.sourceChapterId ? { sourceChapterId: chapter.sourceChapterId } : {}),
          ...(chapter.sourceFile ? { sourceFile: chapter.sourceFile } : {}),
          createdAt: now,
        });
        chaptersCreated++;

        const seenMoves = new Map<string, MoveMetadata & Pick<Doc<"moves">, "_id">>();
        for (const [moveIndex, move] of (chapter.moves ?? []).entries()) {
          if (!move.parentFen || !move.childFen || !move.san || !move.uci) continue;
          const parentPositionId = await upsertPosition(move.parentFen);
          const childPositionId = await upsertPosition(move.childFen);
          const dupKey = `${parentPositionId}:${move.san}`;
          const existingMove = seenMoves.get(dupKey);
          if (existingMove) {
            await mergeDuplicateMove(ctx, existingMove, {
              comment: move.comment ?? undefined,
              annotations: move.annotations,
              isMainLine: move.isMainLine ?? true,
            });
            continue;
          }
          const moveId = await ctx.db.insert("moves", {
            chapterId,
            parentPositionId,
            childPositionId,
            san: move.san,
            uci: move.uci,
            moveNumber: move.moveNumber ?? 1,
            colorToMove: move.colorToMove ?? "white",
            isMainLine: move.isMainLine ?? true,
            moveType: move.moveType ?? "repertoire",
            sortOrder: move.sortOrder ?? moveIndex,
            ...(move.comment ? { comment: move.comment } : {}),
            ...(move.annotations ? { annotations: move.annotations } : {}),
          });
          seenMoves.set(dupKey, {
            _id: moveId,
            comment: move.comment ?? undefined,
            annotations: move.annotations,
            isMainLine: move.isMainLine ?? true,
          });
          movesCreated++;
        }
      }
    }

    return { coursesCreated, chaptersCreated, movesCreated, cardsCreated: 0 };
  },
});
