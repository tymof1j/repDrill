import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

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

type TrainableCourse = {
  course: Doc<"courses">;
  ownerId: Id<"users">;
};

async function getTrainableCourses(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const ownCourses = await ctx.db
    .query("courses")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const result = new Map<string, TrainableCourse>(
    ownCourses.map((course) => [course._id as string, { course, ownerId: course.userId }]),
  );

  const user = await ctx.db.get(userId);
  const email = user?.email?.trim().toLowerCase();
  if (!email) return Array.from(result.values());

  const invitations = await ctx.db
    .query("shareInvitations")
    .withIndex("by_email", (q) => q.eq("email", email))
    .take(100);

  for (const invite of invitations) {
    if (invite.ownerId === userId) continue;
    if (invite.access === "view") continue;
    const isCourseInvite = invite.resourceType === "course";
    const isScopedRepertoireInvite =
      invite.resourceType === "repertoire" &&
      invite.scopeType === "course" &&
      Boolean(invite.scopeId);
    if (!isCourseInvite && !isScopedRepertoireInvite) continue;

    const courseId = (isCourseInvite ? invite.resourceId : invite.scopeId) as Id<"courses">;
    const course = await ctx.db.get(courseId);
    if (!course) continue;
    result.set(course._id as string, { course, ownerId: course.userId });
  }

  return Array.from(result.values());
}

// --- Ensure review cards exist for all repertoire moves ---
export const ensureCards = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const trainableCourses = await getTrainableCourses(ctx, userId);
    if (trainableCourses.length === 0) return 0;

    const allChapterIds: Id<"chapters">[] = [];
    const chapterTypeById = new Map<string, Doc<"chapters">["chapterType"]>();
    for (const { course } of trainableCourses) {
      const chapters = await ctx.db
        .query("chapters")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();
      allChapterIds.push(...chapters.map((c) => c._id));
      for (const chapter of chapters) {
        chapterTypeById.set(chapter._id as string, chapter.chapterType);
      }
    }
    if (allChapterIds.length === 0) return 0;

    const repertoireMoveIds: Id<"moves">[] = [];
    for (const chId of allChapterIds) {
      const chMoves = await ctx.db
        .query("moves")
        .withIndex("by_chapter", (q) => q.eq("chapterId", chId))
        .collect();
      if (chapterTypeById.get(chId as string) === "info_only") continue;
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
  chapterId: string;
  lineKey: string;
  courseName: string;
  courseColor: "white" | "black";
  chapterName: string;
  steps: LineStep[];
  isNew: boolean;
  dueCount: number;
  isInfoOnly: boolean;
};

export type CourseLineStatus = {
  chapterId: string;
  lineIndex: number;
  grade: "A" | "B" | "C" | "D" | "N";
  category: "new" | "learning" | "review" | "due" | "mastered" | "info";
  nextReviewAt: number | null;
  isInfoOnly: boolean;
};

const ROOT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

export const getTrainingLines = query({
  args: {
    courseId: v.optional(v.id("courses")),
    repertoireId: v.optional(v.id("repertoires")),
    fromPositionId: v.optional(v.id("positions")),
    newLineLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };
    const newLineLimit = args.newLineLimit ?? 5;

    // Load courses
    let userCourses = (await getTrainableCourses(ctx, userId)).map((entry) => entry.course);
    if (args.repertoireId) {
      const repCourses = await ctx.db
        .query("repertoireCourses")
        .withIndex("by_repertoire", (q) => q.eq("repertoireId", args.repertoireId!))
        .collect();
      const repCourseIds = new Set(repCourses.map((rc) => rc.courseId as string));
      userCourses = userCourses.filter((c) => repCourseIds.has(c._id as string));
    }
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
    const ownerIds = new Set(userCourses.map((course) => course.userId as string));
    const allPositions: Doc<"positions">[] = [];
    for (const ownerId of ownerIds) {
      const ownerPositions = await ctx.db
        .query("positions")
        .withIndex("by_user_fen", (q) => q.eq("userId", ownerId as Id<"users">))
        .collect();
      allPositions.push(...ownerPositions);
    }
    const posById = new Map(allPositions.map((p) => [p._id as string, p]));

    // Load review cards
    const allCards = await ctx.db
      .query("reviewCards")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .collect();
    const chapterLineSettings = await ctx.db
      .query("chapterLineSettings")
      .collect();
    const lineSettingByChapterAndKey = new Map(
      chapterLineSettings.map((row) => [`${row.chapterId as string}:${row.lineKey}`, row.infoOnly]),
    );
    const cardByMoveId = new Map(allCards.map((c) => [c.moveId as string, c]));

    const chapById = new Map(allChapters.map((c) => [c._id as string, c]));
    const courseById = new Map(userCourses.map((c) => [c._id as string, c]));
    const infoLineViews = await ctx.db
      .query("infoLineViews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const viewedInfoLineKeys = new Set(
      infoLineViews.map((row) => `${row.chapterId as string}:${row.lineKey}`),
    );

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
        const lineKey = steps.map((s) => s.uci).join(" ");
        const lineSettingKey = `${chapterId}:${lineKey}`;
        const lineIsInfoOnly =
          chapter.chapterType === "info_only" || lineSettingByChapterAndKey.get(lineSettingKey) === true;
        if (!steps.some((s) => s.isUserMove) && !lineIsInfoOnly) continue;

        const lineIsNew = steps.some((s) => s.isNew);
        const lineDueCount = steps.filter((s) => {
          if (!s.cardId) return false;
          const card = allCards.find((c) => (c._id as string) === s.cardId);
          return card && card.due <= now;
        }).length;

        totalLines++;
        if (lineIsNew) newLinesCount++;
        if (lineDueCount > 0 || lineIsNew) dueLines++;

        const infoLineAlreadyViewed = viewedInfoLineKeys.has(lineSettingKey);
        if (lineIsInfoOnly && infoLineAlreadyViewed) continue;
        if (!lineIsInfoOnly && !args.fromPositionId && lineDueCount === 0 && !lineIsNew) continue;

        allExtracted.push({
          lineId: `${chapterId}-${i}`,
          chapterId,
          lineKey,
          courseName: course.name,
          courseColor: course.color,
          chapterName: chapter.name,
          steps,
          isNew: lineIsInfoOnly ? false : lineIsNew,
          dueCount: lineIsInfoOnly ? 0 : lineDueCount,
          isInfoOnly: lineIsInfoOnly,
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

export const getCourseLineStatuses = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [] as CourseLineStatus[];

    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== userId) return [] as CourseLineStatus[];

    const chaptersInCourse = await ctx.db
      .query("chapters")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    if (chaptersInCourse.length === 0) return [] as CourseLineStatus[];

    const chapterIds = new Set(chaptersInCourse.map((c) => c._id as string));
    const allMoves = (
      await Promise.all(
        chaptersInCourse.map((chapter) =>
          ctx.db
            .query("moves")
            .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
            .collect()
        ),
      )
    ).flat();
    if (allMoves.length === 0) return [] as CourseLineStatus[];

    const allPositions = await ctx.db
      .query("positions")
      .withIndex("by_user_fen", (q) => q.eq("userId", userId))
      .collect();
    const allCards = await ctx.db
      .query("reviewCards")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .collect();
    const chapterLineSettings = await ctx.db
      .query("chapterLineSettings")
      .collect();
    const lineSettingByChapterAndKey = new Map(
      chapterLineSettings.map((row) => [`${row.chapterId as string}:${row.lineKey}`, row.infoOnly]),
    );
    const cardByMoveId = new Map(allCards.map((c) => [c.moveId as string, c]));
    const now = Date.now();

    const rootPos = allPositions.find((p) => p.fen === ROOT_FEN);
    if (!rootPos) return [] as CourseLineStatus[];

    const movesByParentByChapter = new Map<string, Map<string, Doc<"moves">[]>>();
    for (const move of allMoves) {
      const chapterId = move.chapterId as string;
      if (!chapterIds.has(chapterId)) continue;
      let chapterMap = movesByParentByChapter.get(chapterId);
      if (!chapterMap) {
        chapterMap = new Map();
        movesByParentByChapter.set(chapterId, chapterMap);
      }
      const parentId = move.parentPositionId as string;
      const siblings = chapterMap.get(parentId) ?? [];
      siblings.push(move);
      chapterMap.set(parentId, siblings);
    }
    for (const chapterMap of movesByParentByChapter.values()) {
      for (const siblings of chapterMap.values()) {
        siblings.sort((a, b) => Number(b.isMainLine) - Number(a.isMainLine) || a.sortOrder - b.sortOrder);
      }
    }

    const result: CourseLineStatus[] = [];
    for (const [chapterId, byParent] of movesByParentByChapter.entries()) {
      const lines: { moves: Doc<"moves">[] }[] = [];
      const onPath = new Set<string>();
      const walk = (positionId: string, path: Doc<"moves">[]) => {
        if (onPath.has(positionId)) {
          if (path.length > 0) lines.push({ moves: [...path] });
          return;
        }
        onPath.add(positionId);
        const children = byParent.get(positionId) ?? [];
        if (children.length === 0) {
          if (path.length > 0) lines.push({ moves: [...path] });
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
      walk(rootPos._id as string, []);

      lines.forEach((line, lineIndex) => {
        const repMoves = line.moves.filter((move) => move.moveType === "repertoire");
        const lineKey = line.moves.map((move) => move.uci).join(" ");
        const isInfoOnly =
          chaptersInCourse.find((ch) => (ch._id as string) === chapterId)?.chapterType === "info_only" ||
          lineSettingByChapterAndKey.get(`${chapterId}:${lineKey}`) === true;
        if (isInfoOnly) {
          result.push({
            chapterId,
            lineIndex,
            grade: "N",
            category: "info",
            nextReviewAt: null,
            isInfoOnly: true,
          });
          return;
        }
        const cards = repMoves
          .map((move) => cardByMoveId.get(move._id as string))
          .filter(Boolean) as Doc<"reviewCards">[];
        if (cards.length === 0) {
          result.push({
            chapterId,
            lineIndex,
            grade: "N",
            category: "new",
            nextReviewAt: null,
            isInfoOnly: false,
          });
          return;
        }
        const minDue = cards.reduce((min, card) => Math.min(min, card.due), Number.POSITIVE_INFINITY);
        const dueNow = cards.some((card) => card.due <= now);
        const hasNew = cards.some((card) => card.state === 0);
        const hasLearning = cards.some((card) => card.state === 1 || card.state === 3);
        const avgStability = cards.reduce((sum, card) => sum + card.stability, 0) / cards.length;
        const avgLapses = cards.reduce((sum, card) => sum + card.lapses, 0) / cards.length;
        const mastery = Math.max(0, Math.min(100, Math.round(avgStability * 12 - avgLapses * 8)));
        const grade: CourseLineStatus["grade"] =
          hasNew ? "N" : mastery >= 82 ? "A" : mastery >= 65 ? "B" : mastery >= 45 ? "C" : "D";
        const category: CourseLineStatus["category"] =
          hasNew ? "new" : dueNow ? "due" : hasLearning ? "learning" : mastery >= 82 ? "mastered" : "review";

        result.push({
          chapterId,
          lineIndex,
          grade,
          category,
          nextReviewAt: Number.isFinite(minDue) ? minDue : null,
          isInfoOnly: false,
        });
      });
    }

    return result;
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

export const markInfoLineViewed = mutation({
  args: {
    chapterId: v.id("chapters"),
    lineKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const existing = await ctx.db
      .query("infoLineViews")
      .withIndex("by_user_and_chapter_and_line_key", (q) =>
        q.eq("userId", userId).eq("chapterId", args.chapterId).eq("lineKey", args.lineKey),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { viewedAt: Date.now() });
      return;
    }
    await ctx.db.insert("infoLineViews", {
      userId,
      chapterId: args.chapterId,
      lineKey: args.lineKey,
      viewedAt: Date.now(),
    });
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
