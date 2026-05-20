import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

type ImportedBundle = {
  version?: number;
  courses?: Array<{
    name?: string;
    color?: "white" | "black";
    description?: string | null;
    chapters?: Array<{
      name?: string;
      chapterType?: "training" | "info_only";
      sortOrder?: number;
      description?: string | null;
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
      }>;
    }>;
  }>;
  positions?: Array<{ fen?: string; annotation?: string | null }>;
};

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
    const seenMoves = new Set<string>();
    let movesCreated = 0;
    let movesSkipped = 0;

    for (const [index, mv] of args.moves.entries()) {
      const parentId = await upsertPosition(mv.parentFen);
      const childId = await upsertPosition(mv.fen);

      const dupKey = `${parentId}:${mv.san}`;
      if (seenMoves.has(dupKey)) {
        movesSkipped++;
        continue;
      }
      seenMoves.add(dupKey);

      // Determine move type: whose move is this?
      const colorThatMoved: "white" | "black" =
        mv.colorToMove === "white" ? "black" : "white";
      const moveType =
        colorThatMoved === args.courseColor ? "repertoire" : "opponent";

      await ctx.db.insert("moves", {
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
      });
      movesCreated++;
    }

    return { chapterId, movesCreated, movesSkipped };
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
          createdAt: now,
        });
        chaptersCreated++;

        for (const [moveIndex, move] of (chapter.moves ?? []).entries()) {
          if (!move.parentFen || !move.childFen || !move.san || !move.uci) continue;
          const parentPositionId = await upsertPosition(move.parentFen);
          const childPositionId = await upsertPosition(move.childFen);
          await ctx.db.insert("moves", {
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
          });
          movesCreated++;
        }
      }
    }

    return { coursesCreated, chaptersCreated, movesCreated, cardsCreated: 0 };
  },
});
