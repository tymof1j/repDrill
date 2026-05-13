import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

// Import FSRS logic — we inline the pure functions here since Convex can't import from src/
// These are the same algorithms from src/lib/srs/fsrs.ts
import {
  fsrs,
  createEmptyCard,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
} from "ts-fsrs";

const params = generatorParameters({ enable_fuzz: true });
const f = fsrs(params);

function newCard(): Card {
  return createEmptyCard();
}

function scheduleCard(card: Card, rating: Grade, now?: Date) {
  return f.next(card, now ?? new Date(), rating);
}

// --- Ensure review cards exist for all repertoire moves ---
export const ensureCards = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const userCourses = await ctx.db
      .query("courses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (userCourses.length === 0) return 0;

    const allChapterIds: Id<"chapters">[] = [];
    for (const course of userCourses) {
      const chapters = await ctx.db
        .query("chapters")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();
      allChapterIds.push(...chapters.map((c) => c._id));
    }
    if (allChapterIds.length === 0) return 0;

    const repertoireMoveIds: Id<"moves">[] = [];
    for (const chId of allChapterIds) {
      const chMoves = await ctx.db
        .query("moves")
        .withIndex("by_chapter", (q) => q.eq("chapterId", chId))
        .collect();
      for (const m of chMoves) {
        if (m.moveType === "repertoire") repertoireMoveIds.push(m._id);
      }
    }
    if (repertoireMoveIds.length === 0) return 0;

    const existingCards = await ctx.db
      .query("reviewCards")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .collect();
    const existingMoveIds = new Set(existingCards.map((c) => c.moveId));

    const missing = repertoireMoveIds.filter((id) => !existingMoveIds.has(id));
    if (missing.length === 0) return 0;

    const card = newCard();
    const now = Date.now();
    for (const moveId of missing) {
      await ctx.db.insert("reviewCards", {
        userId,
        moveId,
        due: now,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
      });
    }
    return missing.length;
  },
});

// --- Get training lines ---
export type LineStep = {
  san: string;
  uci: string;
  parentFen: string;
  childFen: string;
  parentPositionId: string;
  childPositionId: string;
  moveNumber: number;
  isUserMove: boolean;
  annotation: string | null;
  cardId: string | null;
  isNew: boolean;
};

export type TrainingLine = {
  lineId: string;
  courseName: string;
  courseColor: "white" | "black";
  chapterName: string;
  steps: LineStep[];
  isNew: boolean;
  dueCount: number;
};

const ROOT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

export const getTrainingLines = query({
  args: {
    courseId: v.optional(v.id("courses")),
    fromPositionId: v.optional(v.id("positions")),
    newLineLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };
    const newLineLimit = args.newLineLimit ?? 5;

    // Load courses
    let userCourses = await ctx.db
      .query("courses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (args.courseId) {
      userCourses = userCourses.filter((c) => c._id === args.courseId);
    }
    if (userCourses.length === 0)
      return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };

    // Load chapters
    const allChapters: Doc<"chapters">[] = [];
    for (const course of userCourses) {
      const chs = await ctx.db
        .query("chapters")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();
      allChapters.push(...chs);
    }
    if (allChapters.length === 0)
      return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };

    // Load all moves
    const allMoves: Doc<"moves">[] = [];
    for (const ch of allChapters) {
      const chMoves = await ctx.db
        .query("moves")
        .withIndex("by_chapter", (q) => q.eq("chapterId", ch._id))
        .collect();
      allMoves.push(...chMoves);
    }
    if (allMoves.length === 0)
      return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };

    // Load all positions for this user in one batch query (replaces O(n) individual gets)
    const allPositions = await ctx.db
      .query("positions")
      .withIndex("by_user_fen", (q) => q.eq("userId", userId))
      .collect();
    const posById = new Map(allPositions.map((p) => [p._id as string, p]));

    // Load review cards
    const allCards = await ctx.db
      .query("reviewCards")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .collect();
    const cardByMoveId = new Map(allCards.map((c) => [c.moveId as string, c]));

    const chapById = new Map(allChapters.map((c) => [c._id as string, c]));
    const courseById = new Map(userCourses.map((c) => [c._id as string, c]));

    const rootPos = allPositions.find((p) => p.fen === ROOT_FEN);
    if (!rootPos)
      return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };

    // Build adjacency per chapter
    const movesByParentByChapter = new Map<
      string,
      Map<string, Doc<"moves">[]>
    >();
    for (const m of allMoves) {
      const chId = m.chapterId as string;
      let chMap = movesByParentByChapter.get(chId);
      if (!chMap) {
        chMap = new Map();
        movesByParentByChapter.set(chId, chMap);
      }
      const parentId = m.parentPositionId as string;
      const arr = chMap.get(parentId) ?? [];
      arr.push(m);
      chMap.set(parentId, arr);
    }
    for (const chMap of movesByParentByChapter.values()) {
      for (const arr of chMap.values()) {
        arr.sort(
          (a, b) =>
            Number(b.isMainLine) - Number(a.isMainLine) ||
            a.sortOrder - b.sortOrder
        );
      }
    }

    const now = Date.now();
    const allExtracted: TrainingLine[] = [];
    let totalLines = 0;
    let dueLines = 0;
    let newLinesCount = 0;

    for (const [chapterId, movesByParent] of movesByParentByChapter) {
      const chapter = chapById.get(chapterId);
      if (!chapter) continue;
      const course = courseById.get(chapter.courseId as string);
      if (!course) continue;

      const chapterLines: LineStep[][] = [];

      // Track positions in current path to break transposition cycles
      const onPath = new Set<string>();

      function dfs(posId: string, path: LineStep[]) {
        if (onPath.has(posId)) {
          if (path.length > 0) chapterLines.push([...path]);
          return;
        }
        onPath.add(posId);
        const children = movesByParent.get(posId);
        if (!children || children.length === 0) {
          if (path.length > 0) chapterLines.push([...path]);
          onPath.delete(posId);
          return;
        }
        for (const m of children) {
          const parentPos = posById.get(m.parentPositionId as string);
          const childPos = posById.get(m.childPositionId as string);
          const card =
            m.moveType === "repertoire"
              ? cardByMoveId.get(m._id as string)
              : null;

          path.push({
            san: m.san,
            uci: m.uci,
            parentFen: parentPos?.fen ?? "",
            childFen: childPos?.fen ?? "",
            parentPositionId: m.parentPositionId as string,
            childPositionId: m.childPositionId as string,
            moveNumber: m.moveNumber,
            isUserMove: m.moveType === "repertoire",
            annotation: childPos?.annotation ?? null,
            cardId: card ? (card._id as string) : null,
            isNew: card ? card.state === 0 : false,
          });
          dfs(m.childPositionId as string, path);
          path.pop();
        }
        onPath.delete(posId);
      }

      dfs(rootPos._id as string, []);

      for (const [i, rawSteps] of chapterLines.entries()) {
        let steps = rawSteps;
        if (args.fromPositionId) {
          const startIdx = rawSteps.findIndex(
            (s) => s.parentPositionId === (args.fromPositionId as string)
          );
          if (startIdx === -1) continue;
          steps = rawSteps.slice(startIdx);
        }
        if (!steps.some((s) => s.isUserMove)) continue;

        const lineIsNew = steps.some((s) => s.isNew);
        const lineDueCount = steps.filter((s) => {
          if (!s.cardId) return false;
          const card = allCards.find((c) => (c._id as string) === s.cardId);
          return card && card.due <= now;
        }).length;

        totalLines++;
        if (lineIsNew) newLinesCount++;
        if (lineDueCount > 0 || lineIsNew) dueLines++;

        if (!args.fromPositionId && lineDueCount === 0 && !lineIsNew) continue;

        allExtracted.push({
          lineId: `${chapterId}-${i}`,
          courseName: course.name,
          courseColor: course.color,
          chapterName: chapter.name,
          steps,
          isNew: lineIsNew,
          dueCount: lineDueCount,
        });
      }
    }

    allExtracted.sort((a, b) => {
      if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
      return b.dueCount - a.dueCount;
    });

    let newSeen = 0;
    const limited = allExtracted.filter((line) => {
      if (!line.isNew) return true;
      newSeen++;
      return newSeen <= newLineLimit;
    });

    return { lines: limited, totalLines, dueLines, newLines: newLinesCount };
  },
});

// --- Quick stats (single index scan, no N+1) ---
export const getQuickStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalLines: 0, dueLines: 0, newLines: 0 };

    const now = Date.now();
    const cards = await ctx.db
      .query("reviewCards")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .collect();

    return {
      totalLines: cards.length,
      dueLines: cards.filter((c) => c.due <= now || c.state === 0).length,
      newLines: cards.filter((c) => c.state === 0).length,
    };
  },
});

// --- Line-level stats (DFS path count, not card count) ---
export const getLineStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalLines: 0, dueLines: 0, newLines: 0 };

    const userCourses = await ctx.db
      .query("courses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (userCourses.length === 0)
      return { totalLines: 0, dueLines: 0, newLines: 0 };

    const allChapters: Doc<"chapters">[] = [];
    for (const course of userCourses) {
      const chs = await ctx.db
        .query("chapters")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();
      allChapters.push(...chs);
    }
    if (allChapters.length === 0)
      return { totalLines: 0, dueLines: 0, newLines: 0 };

    const allMoves: Doc<"moves">[] = [];
    for (const ch of allChapters) {
      const chMoves = await ctx.db
        .query("moves")
        .withIndex("by_chapter", (q) => q.eq("chapterId", ch._id))
        .collect();
      allMoves.push(...chMoves);
    }
    if (allMoves.length === 0)
      return { totalLines: 0, dueLines: 0, newLines: 0 };

    const rootPos = await ctx.db
      .query("positions")
      .withIndex("by_user_fen", (q) =>
        q.eq("userId", userId).eq("fen", ROOT_FEN)
      )
      .first();
    if (!rootPos) return { totalLines: 0, dueLines: 0, newLines: 0 };

    const allCards = await ctx.db
      .query("reviewCards")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .collect();
    const cardByMoveId = new Map(allCards.map((c) => [c.moveId as string, c]));
    const now = Date.now();

    const movesByParentByChapter = new Map<
      string,
      Map<string, Doc<"moves">[]>
    >();
    for (const m of allMoves) {
      const chId = m.chapterId as string;
      let chMap = movesByParentByChapter.get(chId);
      if (!chMap) {
        chMap = new Map();
        movesByParentByChapter.set(chId, chMap);
      }
      const parentId = m.parentPositionId as string;
      const arr = chMap.get(parentId) ?? [];
      arr.push(m);
      chMap.set(parentId, arr);
    }

    let totalLines = 0;
    let dueLines = 0;
    let newLinesCount = 0;

    for (const [, movesByParent] of movesByParentByChapter) {
      const onPath = new Set<string>();

      function countPaths(
        posId: string,
        hasRep: boolean,
        hasDue: boolean,
        hasNew: boolean
      ) {
        if (onPath.has(posId)) {
          if (hasRep) {
            totalLines++;
            if (hasDue || hasNew) dueLines++;
            if (hasNew) newLinesCount++;
          }
          return;
        }
        onPath.add(posId);
        const children = movesByParent.get(posId);
        if (!children || children.length === 0) {
          if (hasRep) {
            totalLines++;
            if (hasDue || hasNew) dueLines++;
            if (hasNew) newLinesCount++;
          }
          onPath.delete(posId);
          return;
        }
        for (const m of children) {
          const isRep = m.moveType === "repertoire";
          const card = isRep ? cardByMoveId.get(m._id as string) : null;
          countPaths(
            m.childPositionId as string,
            hasRep || isRep,
            hasDue || (card ? card.due <= now : false),
            hasNew || (card ? card.state === 0 : false)
          );
        }
        onPath.delete(posId);
      }

      countPaths(rootPos._id as string, false, false, false);
    }

    return { totalLines, dueLines, newLines: newLinesCount };
  },
});

// --- Submit line ratings ---
export const submitLineRatings = mutation({
  args: {
    results: v.array(
      v.object({
        cardId: v.id("reviewCards"),
        correct: v.boolean(),
        responseTimeMs: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    for (const r of args.results) {
      const row = await ctx.db.get(r.cardId);
      if (!row || row.userId !== userId) continue;

      const card: Card = {
        due: new Date(row.due),
        stability: row.stability,
        difficulty: row.difficulty,
        elapsed_days: row.elapsedDays,
        scheduled_days: row.scheduledDays,
        learning_steps: 0,
        reps: row.reps,
        lapses: row.lapses,
        state: row.state as 0 | 1 | 2 | 3,
        last_review: row.lastReview ? new Date(row.lastReview) : undefined,
      };

      const rating: Grade = r.correct ? Rating.Good : Rating.Again;
      const now = new Date();
      const result = scheduleCard(card, rating, now);
      const updated = result.card;

      await ctx.db.patch(r.cardId, {
        due: updated.due.getTime(),
        stability: updated.stability,
        difficulty: updated.difficulty,
        elapsedDays: updated.elapsed_days,
        scheduledDays: updated.scheduled_days,
        reps: updated.reps,
        lapses: updated.lapses,
        state: updated.state,
        lastReview: now.getTime(),
      });

      await ctx.db.insert("reviewLogs", {
        cardId: r.cardId,
        rating,
        responseTimeMs: r.responseTimeMs,
        reviewedAt: now.getTime(),
        prevStability: card.stability,
        prevDifficulty: card.difficulty,
        prevState: card.state,
      });
    }
  },
});

// --- Get training stats ---
export const getTrainingStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        totalCards: 0,
        dueNow: 0,
        newCards: 0,
        reviewedToday: 0,
        correctToday: 0,
        accuracyToday: 0,
      };

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const allCards = await ctx.db
      .query("reviewCards")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .collect();

    const totalCards = allCards.length;
    const dueNow = allCards.filter((c) => c.due <= now).length;
    const newCards = allCards.filter((c) => c.state === 0).length;

    // Count today's reviews
    let reviewedToday = 0;
    let correctToday = 0;
    for (const card of allCards) {
      const logs = await ctx.db
        .query("reviewLogs")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .collect();
      for (const log of logs) {
        if (log.reviewedAt >= todayStartMs) {
          reviewedToday++;
          if (log.rating >= Rating.Good) correctToday++;
        }
      }
    }

    const accuracyToday =
      reviewedToday > 0 ? Math.round((correctToday / reviewedToday) * 100) : 0;

    return {
      totalCards,
      dueNow,
      newCards,
      reviewedToday,
      correctToday,
      accuracyToday,
    };
  },
});

export const exportReviewData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { cards: [], logs: [] };

    const cards = await ctx.db
      .query("reviewCards")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .collect();

    const logs = [];
    for (const card of cards) {
      const cardLogs = await ctx.db
        .query("reviewLogs")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .collect();
      logs.push(...cardLogs);
    }

    return { cards, logs };
  },
});
