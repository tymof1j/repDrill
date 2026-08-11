import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";

async function canReadSharedCourse(ctx: QueryCtx, courseId: Id<"courses">, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user?.email) return false;
  const invitations = await ctx.db
    .query("shareInvitations")
    .withIndex("by_email", (q) => q.eq("email", user.email!.trim().toLowerCase()))
    .take(100);
  return invitations.some((invite) =>
    (invite.resourceType === "course" && invite.resourceId === courseId) ||
    (invite.resourceType === "repertoire" && invite.scopeType === "course" && invite.scopeId === courseId)
  );
}

async function getDirectCourseAccess(ctx: QueryCtx | MutationCtx, courseId: Id<"courses">, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user?.email) return null;
  const invitations = await ctx.db
    .query("shareInvitations")
    .withIndex("by_email", (q) => q.eq("email", user.email!.trim().toLowerCase()))
    .take(100);
  const match = invitations.find((invite) =>
    (invite.resourceType === "course" && invite.resourceId === courseId) ||
    (invite.resourceType === "repertoire" && invite.scopeType === "course" && invite.scopeId === courseId)
  );
  return match?.access ?? null;
}

async function courseContainsPosition(ctx: QueryCtx | MutationCtx, courseId: Id<"courses">, positionId: Id<"positions">) {
  const chapters = await ctx.db
    .query("chapters")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .take(1000);
  for (const chapter of chapters) {
    const moves = await ctx.db
      .query("moves")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
      .take(1000);
    if (moves.some((move) => move.parentPositionId === positionId || move.childPositionId === positionId)) {
      return true;
    }
  }
  return false;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return courses.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const get = query({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const course = await ctx.db.get(args.id);
    if (!course) return null;
    if (course.userId !== userId && !(await canReadSharedCourse(ctx, args.id, userId))) return null;
    return course;
  },
});

export const listChapters = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const course = await ctx.db.get(args.courseId);
    if (!course) return [];
    if (course.userId !== userId && !(await canReadSharedCourse(ctx, args.courseId, userId))) return [];

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    return chapters.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.createdAt - b.createdAt;
    });
  },
});

/**
 * Returns the entire course tree in one query. Kept for the export routes,
 * which run on demand. The page load uses `getChapterTree` per chapter
 * instead — a single course can exceed Convex's 32k document-read limit.
 */
export const getTree = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const course = await ctx.db.get(args.courseId);
    if (!course) return null;
    if (course.userId !== userId && !(await canReadSharedCourse(ctx, args.courseId, userId))) return null;

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    chapters.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.createdAt - b.createdAt;
    });

    const moves: Doc<"moves">[] = [];
    const positionIds = new Set<Id<"positions">>();
    for (const chapter of chapters) {
      const chapterMoves = await ctx.db
        .query("moves")
        .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
        .collect();
      chapterMoves.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const move of chapterMoves) {
        moves.push(move);
        positionIds.add(move.parentPositionId);
        positionIds.add(move.childPositionId);
      }
    }

    const positions: Doc<"positions">[] = [];
    for (const positionId of positionIds) {
      const position = await ctx.db.get(positionId);
      if (position && position.userId === userId) positions.push(position);
    }

    const root =
      positions.find((position) => position.fen === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -") ??
      positions.find((position) => !moves.some((move) => move.childPositionId === position._id)) ??
      null;

    return { course, chapters, moves, positions, rootPositionId: root?._id ?? null };
  },
});

/**
 * Returns moves + positions for a single chapter. Bounded by the chapter's
 * own size, so each call stays well under Convex's 32k document-read limit.
 * The page loads chapters in parallel via this query and merges client-side.
 */
export const getChapterTree = query({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) return null;
    const course = await ctx.db.get(chapter.courseId);
    if (!course) return null;
    if (course.userId !== userId && !(await canReadSharedCourse(ctx, chapter.courseId, userId))) return null;

    const moves = await ctx.db
      .query("moves")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();
    moves.sort((a, b) => a.sortOrder - b.sortOrder);

    const positionIds = new Set<Id<"positions">>();
    for (const move of moves) {
      positionIds.add(move.parentPositionId);
      positionIds.add(move.childPositionId);
    }

    const positions: Doc<"positions">[] = [];
    for (const positionId of positionIds) {
      const position = await ctx.db.get(positionId);
      if (position && position.userId === course.userId) positions.push(position);
    }

    return { moves, positions };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.union(v.literal("white"), v.literal("black")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const now = Date.now();
    return await ctx.db.insert("courses", {
      userId,
      name: args.name,
      color: args.color,
      description: args.description,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Return the user's deterministic course for an external archive, creating it
 * exactly once.  One-click fixture imports use this instead of matching by
 * display name, which keeps retries idempotent when a request times out after
 * Convex has already committed the course row.
 */
export const ensureImported = mutation({
  args: {
    sourceCourseId: v.string(),
    name: v.string(),
    color: v.union(v.literal("white"), v.literal("black")),
    description: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("courses")
      .withIndex("by_user_and_source_course_id", (q) =>
        q.eq("userId", userId).eq("sourceCourseId", args.sourceCourseId),
      )
      .first();
    if (existing) return { courseId: existing._id, created: false };

    const now = Date.now();
    const courseId = await ctx.db.insert("courses", {
      userId,
      name: args.name,
      color: args.color,
      description: args.description,
      sourceCourseId: args.sourceCourseId,
      sourceUrl: args.sourceUrl,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });
    return { courseId, created: true };
  },
});

export const remove = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const course = await ctx.db.get(args.id);
    if (!course || course.userId !== userId) throw new Error("Course not found or access denied");

    // Delete the course record in this small transaction first. The previous
    // implementation tried to remove every chapter and move in one mutation;
    // large Chessable imports exceeded Convex's transaction limits and the
    // whole deletion rolled back. Background imports could then keep writing
    // to the course. The course disappears immediately, while the cleanup
    // worker removes its child rows in bounded batches.
    await ctx.db.delete(args.id);
    await ctx.scheduler.runAfter(0, internal.courses.cleanupRemovedCourse, { courseId: args.id });
  },
});

/**
 * Remove child rows left behind after a course record is deleted.
 *
 * This intentionally does only a bounded amount of work per mutation. It is
 * safe to retry: missing rows are ignored and any in-flight import worker
 * stops as soon as it sees that the parent course no longer exists.
 */
export const cleanupRemovedCourse = internalMutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .take(4);

    for (const chapter of chapters) {
      const moves = await ctx.db
        .query("moves")
        .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
        .take(101);

      for (const move of moves.slice(0, 100)) {
        await ctx.db.delete(move._id);
      }

      // If this chapter still has moves, leave it in place and continue it in
      // the next scheduled mutation. This keeps each transaction small.
      if (moves.length > 100) {
        await ctx.scheduler.runAfter(0, internal.courses.cleanupRemovedCourse, { courseId: args.courseId });
        return;
      }

      await ctx.db.delete(chapter._id);
    }

    if (chapters.length > 0) {
      await ctx.scheduler.runAfter(0, internal.courses.cleanupRemovedCourse, { courseId: args.courseId });
    }
  },
});

export const rename = mutation({
  args: { id: v.id("courses"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const course = await ctx.db.get(args.id);
    if (!course || course.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { name: args.name, updatedAt: Date.now() });
  },
});

export const renameChapter = mutation({
  args: { id: v.id("chapters"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const chapter = await ctx.db.get(args.id);
    if (!chapter) throw new Error("Not found");
    const course = await ctx.db.get(chapter.courseId);
    if (!course || course.userId !== userId) throw new Error("Not found");
    
    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const reorderChapters = mutation({
  args: {
    courseId: v.id("courses"),
    chapterIds: v.array(v.id("chapters")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== userId) throw new Error("Not found");

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    if (chapters.length !== args.chapterIds.length) throw new Error("Invalid chapter list");

    const ownedIds = new Set(chapters.map((chapter) => chapter._id));
    for (const chapterId of args.chapterIds) {
      if (!ownedIds.has(chapterId)) throw new Error("Invalid chapter list");
    }

    for (const [index, chapterId] of args.chapterIds.entries()) {
      await ctx.db.patch(chapterId, { sortOrder: index });
    }
    await ctx.db.patch(args.courseId, { lastChapterReorderAt: Date.now(), updatedAt: Date.now() });
  },
});

export const deleteChapter = mutation({
  args: { id: v.id("chapters") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const chapter = await ctx.db.get(args.id);
    if (!chapter) throw new Error("Not found");
    const course = await ctx.db.get(chapter.courseId);
    if (!course || course.userId !== userId) throw new Error("Not found");

    // Stop an import worker from recreating moves under a chapter that the
    // user has just removed. Keep the import record for history, but mark any
    // unfinished work as cancelled before deleting the chapter itself.
    const chapterImports = await ctx.db
      .query("courseImportChapters")
      .withIndex("by_created_chapter_id", (q) => q.eq("createdChapterId", args.id))
      .collect();
    for (const chapterImport of chapterImports) {
      if (chapterImport.status === "queued" || chapterImport.status === "processing") {
        await ctx.db.patch(chapterImport._id, {
          status: "failed",
          error: "Chapter deleted by user",
          updatedAt: Date.now(),
        });
      }
    }

    // Remove the parent immediately so the chapter disappears from the UI and
    // training queries. Child rows are cleaned up in bounded background
    // mutations so a large imported chapter cannot exceed Convex limits.
    await ctx.db.delete(args.id);
    await ctx.scheduler.runAfter(0, internal.courses.cleanupDeletedChapter, { chapterId: args.id });
  },
});

/**
 * Delete rows owned by a chapter in small retryable batches. Review logs and
 * cards are removed with their moves; shared position rows are intentionally
 * retained because another chapter may still reference the same FEN.
 */
export const cleanupDeletedChapter = internalMutation({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const moves = await ctx.db
      .query("moves")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .take(40);

    for (const move of moves) {
      const cards = await ctx.db
        .query("reviewCards")
        .withIndex("by_move", (q) => q.eq("moveId", move._id))
        .collect();
      for (const card of cards) {
        const logs = await ctx.db
          .query("reviewLogs")
          .withIndex("by_card", (q) => q.eq("cardId", card._id))
          .collect();
        for (const log of logs) await ctx.db.delete(log._id);
        await ctx.db.delete(card._id);
      }
      await ctx.db.delete(move._id);
    }

    if (moves.length > 0) {
      await ctx.scheduler.runAfter(0, internal.courses.cleanupDeletedChapter, { chapterId: args.chapterId });
      return;
    }

    const settings = await ctx.db
      .query("chapterLineSettings")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .take(100);
    for (const setting of settings) await ctx.db.delete(setting._id);

    const views = await ctx.db
      .query("infoLineViews")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .take(100);
    for (const view of views) await ctx.db.delete(view._id);

    const imports = await ctx.db
      .query("courseImportChapters")
      .withIndex("by_created_chapter_id", (q) => q.eq("createdChapterId", args.chapterId))
      .take(20);
    let chunksRemain = false;
    for (const chapterImport of imports) {
      const chunks = await ctx.db
        .query("courseImportMoveChunks")
        .withIndex("by_chapter_import_and_chunk_index", (q) => q.eq("chapterImportId", chapterImport._id))
        .take(100);
      for (const chunk of chunks) await ctx.db.delete(chunk._id);
      if (chunks.length > 0) chunksRemain = true;
    }

    if (settings.length === 100 || views.length === 100 || chunksRemain) {
      await ctx.scheduler.runAfter(0, internal.courses.cleanupDeletedChapter, { chapterId: args.chapterId });
    }
  },
});

function buildLineKey(moves: Doc<"moves">[]) {
  return moves.map((move) => move.uci).join(" ");
}

export const setLineInfoOnly = mutation({
  args: {
    chapterId: v.id("chapters"),
    lineKey: v.string(),
    infoOnly: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) throw new Error("Not found");
    const course = await ctx.db.get(chapter.courseId);
    if (!course || course.userId !== userId) throw new Error("Not found");

    const moves = await ctx.db
      .query("moves")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();
    const byParent = new Map<string, Doc<"moves">[]>();
    for (const move of moves) {
      const siblings = byParent.get(move.parentPositionId as string) ?? [];
      siblings.push(move);
      byParent.set(move.parentPositionId as string, siblings);
    }
    for (const siblings of byParent.values()) {
      siblings.sort((a, b) => Number(b.isMainLine) - Number(a.isMainLine) || a.sortOrder - b.sortOrder);
    }

    const lines: Doc<"moves">[][] = [];
    const onPath = new Set<string>();
    const walk = (positionId: string, path: Doc<"moves">[]) => {
      if (onPath.has(positionId)) {
        if (path.length > 0) lines.push([...path]);
        return;
      }
      onPath.add(positionId);
      const children = byParent.get(positionId) ?? [];
      if (children.length === 0) {
        if (path.length > 0) lines.push([...path]);
        onPath.delete(positionId);
        return;
      }
      for (const child of children) {
        path.push(child);
        walk(child.childPositionId as string, path);
        path.pop();
      }
      onPath.delete(positionId);
    };
    const childIds = new Set(moves.map((move) => move.childPositionId as string));
    const rootIds = Array.from(new Set(moves.map((move) => move.parentPositionId as string)))
      .filter((positionId) => !childIds.has(positionId));
    for (const rootId of rootIds.length > 0 ? rootIds : [moves[0]?.parentPositionId as string]) {
      walk(rootId, []);
    }

    const target = lines.find((line) => buildLineKey(line) === args.lineKey);
    if (!target || target.length === 0) throw new Error("Line not found");
    const lineKey = buildLineKey(target);

    const existing = await ctx.db
      .query("chapterLineSettings")
      .withIndex("by_chapter_and_line_key", (q) => q.eq("chapterId", args.chapterId).eq("lineKey", lineKey))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { infoOnly: args.infoOnly, updatedAt: Date.now() });
      return;
    }
    await ctx.db.insert("chapterLineSettings", {
      chapterId: args.chapterId,
      lineKey,
      infoOnly: args.infoOnly,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const setSharing = mutation({
  args: {
    courseId: v.id("courses"),
    intent: v.union(v.literal("enable"), v.literal("disable"), v.literal("rotate")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== userId) throw new Error("Not found");

    let isPublic = course.isPublic;
    let token = course.shareToken;

    if (args.intent === 'disable') {
      isPublic = false;
    } else if (args.intent === 'enable') {
      isPublic = true;
      if (!token) token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    } else if (args.intent === 'rotate') {
      isPublic = true;
      token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    }

    await ctx.db.patch(args.courseId, { isPublic, shareToken: token, updatedAt: Date.now() });
    return { token: isPublic ? token : null, isPublic };
  },
});

export const getPublicByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    let course = await ctx.db
      .query("courses")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.token))
      .first();
    let access: "view" | "copy" | "collaborate" = "copy";
    let scopeType: "resource" | "course" | "chapter" | "line" = "resource";
    let scopeId: string | undefined;
    let scopeLabel: string | undefined;
    if (!course || !course.isPublic) {
      const link = await ctx.db
        .query("shareLinks")
        .withIndex("by_token", (q) => q.eq("token", args.token))
        .unique();
      if (!link || link.access === "none") return null;
      if (link.resourceType === "course") {
        course = await ctx.db.get(link.resourceId as Id<"courses">);
      } else if (link.resourceType === "repertoire" && link.scopeType === "course" && link.scopeId) {
        const junctions = await ctx.db
          .query("repertoireCourses")
          .withIndex("by_repertoire", (q) => q.eq("repertoireId", link.resourceId as Id<"repertoires">))
          .collect();
        if (!junctions.some((junction) => junction.courseId === link.scopeId)) return null;
        course = await ctx.db.get(link.scopeId as Id<"courses">);
      } else {
        return null;
      }
      if (!course) return null;
      access = link.access;
      scopeType = link.resourceType === "repertoire" ? "resource" : (link.scopeType ?? "resource");
      scopeId = link.resourceType === "repertoire" ? undefined : link.scopeId;
      scopeLabel = link.scopeLabel;
    }
    const userId = await getAuthUserId(ctx);
    if (userId) {
      const user = await ctx.db.get(userId);
      if (user?.email) {
        const invitations = await ctx.db
          .query("shareInvitations")
          .withIndex("by_email", (q) => q.eq("email", user.email!.trim().toLowerCase()))
          .take(100);
        for (const invitation of invitations) {
          if (invitation.resourceType !== "course" || invitation.resourceId !== course._id) continue;
          if (invitation.access === "collaborate") access = "collaborate";
          else if (invitation.access === "copy" && access === "view") access = "copy";
        }
      }
    }

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();
    chapters.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.createdAt - b.createdAt;
    });

    const visibleChapters =
      scopeType === "chapter" && scopeId
        ? chapters.filter((chapter) => chapter._id === scopeId)
        : chapters;

    return { course, chapters: visibleChapters, access, scopeType, scopeId, scopeLabel };
  },
});

export const getPublicChapterTree = query({
  args: { token: v.string(), chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    let course = await ctx.db
      .query("courses")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.token))
      .first();
    if (!course || !course.isPublic) {
      const link = await ctx.db
        .query("shareLinks")
        .withIndex("by_token", (q) => q.eq("token", args.token))
        .unique();
      if (!link || link.access === "none") return null;
      if (link.resourceType === "course") {
        course = await ctx.db.get(link.resourceId as Id<"courses">);
      } else if (link.resourceType === "repertoire" && link.scopeType === "course" && link.scopeId) {
        const junctions = await ctx.db
          .query("repertoireCourses")
          .withIndex("by_repertoire", (q) => q.eq("repertoireId", link.resourceId as Id<"repertoires">))
          .collect();
        if (!junctions.some((junction) => junction.courseId === link.scopeId)) return null;
        course = await ctx.db.get(link.scopeId as Id<"courses">);
      } else {
        return null;
      }
      if (!course) return null;
    }

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter || chapter.courseId !== course._id) return null;

    const moves = await ctx.db
      .query("moves")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();
    moves.sort((a, b) => a.sortOrder - b.sortOrder);

    const positionIds = new Set<Id<"positions">>();
    for (const move of moves) {
      positionIds.add(move.parentPositionId);
      positionIds.add(move.childPositionId);
    }

    const positions: Doc<"positions">[] = [];
    for (const positionId of positionIds) {
      const position = await ctx.db.get(positionId);
      if (position && position.userId === course.userId) positions.push(position);
    }

    return { moves, positions };
  },
});

export const updateAnnotation = mutation({
  args: {
    positionId: v.id("positions"),
    text: v.string(),
    courseId: v.optional(v.id("courses")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const position = await ctx.db.get(args.positionId);
    if (!position) throw new Error("Not found");
    if (position.userId !== userId) {
      if (!args.courseId) throw new Error("Not found");
      const course = await ctx.db.get(args.courseId);
      if (!course || course.userId !== position.userId) throw new Error("Not found");
      const access = await getDirectCourseAccess(ctx, args.courseId, userId);
      if (access !== "collaborate") throw new Error("Not found");
      if (!(await courseContainsPosition(ctx, args.courseId, args.positionId))) throw new Error("Not found");
    }

    await ctx.db.patch(args.positionId, { annotation: args.text || undefined });
  },
});
