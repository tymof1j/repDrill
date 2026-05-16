import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

async function loadRepertoireTree(ctx: QueryCtx, repertoireId: Id<"repertoires">) {
  const courseRows = await ctx.db
    .query("repertoireCourses")
    .withIndex("by_repertoire", (q) => q.eq("repertoireId", repertoireId))
    .collect();

  const courses = [];
  for (const cr of courseRows) {
    const course = await ctx.db.get(cr.courseId);
    if (course) courses.push({ junctionId: cr._id, sortOrder: cr.sortOrder, course });
  }

  const courseIds = courses.map((c) => c.course._id);
  if (courseIds.length === 0) {
    return { courses, chapters: [], moves: [], positions: [], choices: [] };
  }

  const chapters: Doc<"chapters">[] = [];
  for (const courseId of courseIds) {
    const chs = await ctx.db
      .query("chapters")
      .withIndex("by_course", (q) => q.eq("courseId", courseId))
      .collect();
    chapters.push(...chs);
  }

  const moves: Doc<"moves">[] = [];
  for (const ch of chapters) {
    const chMoves = await ctx.db
      .query("moves")
      .withIndex("by_chapter", (q) => q.eq("chapterId", ch._id))
      .collect();
    moves.push(...chMoves);
  }

  const positionIds = new Set<string>();
  for (const m of moves) {
    positionIds.add(m.parentPositionId as string);
    positionIds.add(m.childPositionId as string);
  }
  const positions: Doc<"positions">[] = [];
  for (const id of positionIds) {
    const pos = await ctx.db.get(id as Id<"positions">);
    if (pos) positions.push(pos);
  }

  const choices = await ctx.db
    .query("repertoireChoices")
    .withIndex("by_repertoire", (q) => q.eq("repertoireId", repertoireId))
    .collect();

  return { courses, chapters, moves, positions, choices };
}

async function canReadSharedRepertoire(ctx: QueryCtx, repertoireId: Id<"repertoires">, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user?.email) return false;
  const invitations = await ctx.db
    .query("shareInvitations")
    .withIndex("by_email", (q) => q.eq("email", user.email!.trim().toLowerCase()))
    .take(100);
  return invitations.some((invite) =>
    invite.resourceType === "repertoire" &&
    invite.resourceId === repertoireId &&
    (invite.scopeType === undefined || invite.scopeType === "resource")
  );
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const reps = await ctx.db
      .query("repertoires")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return reps.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const get = query({
  args: { id: v.id("repertoires") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rep = await ctx.db.get(args.id);
    if (!rep) return null;
    if (rep.userId !== userId && !(await canReadSharedRepertoire(ctx, args.id, userId))) return null;
    return rep;
  },
});

export const create = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const now = Date.now();
    return await ctx.db.insert("repertoires", {
      userId,
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("repertoires") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const rep = await ctx.db.get(args.id);
    if (!rep || rep.userId !== userId) throw new Error("Not found");

    // Clean up junction rows
    const junctions = await ctx.db
      .query("repertoireCourses")
      .withIndex("by_repertoire", (q) => q.eq("repertoireId", args.id))
      .collect();
    for (const j of junctions) await ctx.db.delete(j._id);

    const choices = await ctx.db
      .query("repertoireChoices")
      .withIndex("by_repertoire", (q) => q.eq("repertoireId", args.id))
      .collect();
    for (const c of choices) await ctx.db.delete(c._id);

    await ctx.db.delete(args.id);
  },
});

export const rename = mutation({
  args: { id: v.id("repertoires"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const rep = await ctx.db.get(args.id);
    if (!rep || rep.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const addCourse = mutation({
  args: { repertoireId: v.id("repertoires"), courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const rep = await ctx.db.get(args.repertoireId);
    if (!rep || rep.userId !== userId) throw new Error("Not found");
    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== userId) throw new Error("Course not found");

    // Check if already added
    const existing = await ctx.db
      .query("repertoireCourses")
      .withIndex("by_repertoire", (q) => q.eq("repertoireId", args.repertoireId))
      .collect();
    if (existing.some((e) => e.courseId === args.courseId)) return;

    const nextOrder = existing.reduce(
      (max, r) => Math.max(max, r.sortOrder + 1),
      0
    );
    await ctx.db.insert("repertoireCourses", {
      repertoireId: args.repertoireId,
      courseId: args.courseId,
      sortOrder: nextOrder,
    });
  },
});

export const removeCourse = mutation({
  args: { repertoireId: v.id("repertoires"), courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const rep = await ctx.db.get(args.repertoireId);
    if (!rep || rep.userId !== userId) throw new Error("Not found");

    const junctions = await ctx.db
      .query("repertoireCourses")
      .withIndex("by_repertoire", (q) => q.eq("repertoireId", args.repertoireId))
      .collect();
    const match = junctions.find((j) => j.courseId === args.courseId);
    if (match) await ctx.db.delete(match._id);
  },
});

export const setChoice = mutation({
  args: {
    repertoireId: v.id("repertoires"),
    positionId: v.id("positions"),
    moveId: v.id("moves"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const rep = await ctx.db.get(args.repertoireId);
    if (!rep || rep.userId !== userId) throw new Error("Not found");

    // Remove existing choice for this position
    const existing = await ctx.db
      .query("repertoireChoices")
      .withIndex("by_repertoire", (q) => q.eq("repertoireId", args.repertoireId))
      .filter((q) => q.eq(q.field("positionId"), args.positionId))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);

    await ctx.db.insert("repertoireChoices", {
      repertoireId: args.repertoireId,
      positionId: args.positionId,
      preferredMoveId: args.moveId,
    });
  },
});

export const clearChoice = mutation({
  args: {
    repertoireId: v.id("repertoires"),
    positionId: v.id("positions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const rep = await ctx.db.get(args.repertoireId);
    if (!rep || rep.userId !== userId) throw new Error("Not found");

    const existing = await ctx.db
      .query("repertoireChoices")
      .withIndex("by_repertoire", (q) => q.eq("repertoireId", args.repertoireId))
      .filter((q) => q.eq(q.field("positionId"), args.positionId))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);
  },
});

export const listCourses = query({
  args: { repertoireId: v.id("repertoires") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rep = await ctx.db.get(args.repertoireId);
    if (!rep) return [];
    if (rep.userId !== userId && !(await canReadSharedRepertoire(ctx, args.repertoireId, userId))) return [];

    const junctions = await ctx.db
      .query("repertoireCourses")
      .withIndex("by_repertoire", (q) => q.eq("repertoireId", args.repertoireId))
      .collect();
    junctions.sort((a, b) => a.sortOrder - b.sortOrder);

    const result = [];
    for (const j of junctions) {
      const course = await ctx.db.get(j.courseId);
      if (course) {
        result.push({ junctionId: j._id, sortOrder: j.sortOrder, course });
      }
    }
    return result;
  },
});

export const loadTree = query({
  args: { repertoireId: v.id("repertoires") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { courses: [], chapters: [], moves: [], positions: [], choices: [] };
    const rep = await ctx.db.get(args.repertoireId);
    if (!rep) return { courses: [], chapters: [], moves: [], positions: [], choices: [] };
    if (rep.userId !== userId && !(await canReadSharedRepertoire(ctx, args.repertoireId, userId))) {
      return { courses: [], chapters: [], moves: [], positions: [], choices: [] };
    }

    return await loadRepertoireTree(ctx, args.repertoireId);
  },
});

export const getPublicByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (
      !link ||
      link.resourceType !== "repertoire" ||
      link.access === "none" ||
      (link.scopeType && link.scopeType !== "resource")
    ) {
      return null;
    }

    const repertoire = await ctx.db.get(link.resourceId as Id<"repertoires">);
    if (!repertoire) return null;
    const tree = await loadRepertoireTree(ctx, repertoire._id);
    return { repertoire, access: link.access, ...tree };
  },
});
