import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

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
    if (!course || course.userId !== userId) return null;
    return course;
  },
});

export const listChapters = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
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
    if (!course || course.userId !== userId) return null;

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
    if (!course || course.userId !== userId) return null;

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
      if (position && position.userId === userId) positions.push(position);
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

export const remove = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const course = await ctx.db.get(args.id);
    if (!course || course.userId !== userId) throw new Error("Course not found or access denied");
    
    // We should also delete chapters, moves, etc. 
    // Convex doesn't have CASCADE delete out of the box, so we need to clean them up.
    const chapters = await ctx.db.query("chapters").withIndex("by_course", q => q.eq("courseId", args.id)).collect();
    for (const chapter of chapters) {
      const moves = await ctx.db.query("moves").withIndex("by_chapter", q => q.eq("chapterId", chapter._id)).collect();
      for (const move of moves) {
        await ctx.db.delete(move._id);
      }
      await ctx.db.delete(chapter._id);
    }
    await ctx.db.delete(args.id);
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

export const deleteChapter = mutation({
  args: { id: v.id("chapters") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const chapter = await ctx.db.get(args.id);
    if (!chapter) throw new Error("Not found");
    const course = await ctx.db.get(chapter.courseId);
    if (!course || course.userId !== userId) throw new Error("Not found");

    const moves = await ctx.db.query("moves").withIndex("by_chapter", q => q.eq("chapterId", args.id)).collect();
    for (const move of moves) {
      await ctx.db.delete(move._id);
    }
    await ctx.db.delete(args.id);
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

export const updateAnnotation = mutation({
  args: { positionId: v.id("positions"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const position = await ctx.db.get(args.positionId);
    if (!position || position.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.positionId, { annotation: args.text || undefined });
  },
});
