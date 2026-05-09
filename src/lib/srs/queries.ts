import 'server-only';
import { and, eq, lte, inArray, sql, count, isNull, asc, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import {
  reviewCards,
  reviewLogs,
  moves,
  positions,
  chapters,
  courses,
} from '@/lib/db/schema';
import { newCard, scheduleCard, Rating, type Card, type Grade } from './fsrs';

export type DueCard = {
  cardId: string;
  moveId: string;
  san: string;
  uci: string;
  moveNumber: number;
  colorToMove: 'white' | 'black';
  moveType: 'repertoire' | 'opponent' | 'alternative';
  parentFen: string;
  childFen: string;
  parentPositionId: string;
  childPositionId: string;
  annotation: string | null;
  courseName: string;
  courseColor: 'white' | 'black';
  chapterName: string;
  // FSRS card state
  state: number;
  due: Date;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
};

export async function ensureCardsExist(userId: string): Promise<number> {
  const userCourseIds = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.userId, userId));
  if (userCourseIds.length === 0) return 0;

  const courseIds = userCourseIds.map((c) => c.id);
  const chapterRows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(inArray(chapters.courseId, courseIds));
  if (chapterRows.length === 0) return 0;
  const chapterIds = chapterRows.map((c) => c.id);

  const repertoireMoves = await db
    .select({ id: moves.id })
    .from(moves)
    .where(
      and(
        inArray(moves.chapterId, chapterIds),
        eq(moves.moveType, 'repertoire'),
      ),
    );
  if (repertoireMoves.length === 0) return 0;

  const existingCards = await db
    .select({ moveId: reviewCards.moveId })
    .from(reviewCards)
    .where(eq(reviewCards.userId, userId));
  const existingMoveIds = new Set(existingCards.map((c) => c.moveId));

  const missing = repertoireMoves.filter((m) => !existingMoveIds.has(m.id));
  if (missing.length === 0) return 0;

  const card = newCard();
  const now = new Date();
  const values = missing.map((m) => ({
    id: nanoid(12),
    userId,
    moveId: m.id,
    due: now,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: null as Date | null,
  }));

  for (let i = 0; i < values.length; i += 100) {
    await db.insert(reviewCards).values(values.slice(i, i + 100));
  }
  return missing.length;
}

export async function getDueCards(
  userId: string,
  opts: {
    courseId?: string;
    chapterId?: string;
    limit?: number;
    newCardLimit?: number;
  } = {},
): Promise<DueCard[]> {
  const now = new Date();
  const limit = opts.limit ?? 50;
  const newCardLimit = opts.newCardLimit ?? 20;

  let chapterFilter: string[] | undefined;
  if (opts.chapterId) {
    chapterFilter = [opts.chapterId];
  } else if (opts.courseId) {
    const chs = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.courseId, opts.courseId));
    chapterFilter = chs.map((c) => c.id);
    if (chapterFilter.length === 0) return [];
  }

  const parentPos = db.$with('parent_pos').as(
    db.select({ id: positions.id, fen: positions.fen, annotation: positions.annotation }).from(positions),
  );
  const childPos = db.$with('child_pos').as(
    db.select({ id: positions.id, fen: positions.fen }).from(positions),
  );

  // Due (overdue + learning) cards
  const conditions = [
    eq(reviewCards.userId, userId),
    lte(reviewCards.due, now),
  ];
  if (chapterFilter) {
    conditions.push(inArray(moves.chapterId, chapterFilter));
  }

  const dueRows = await db
    .select({
      cardId: reviewCards.id,
      moveId: moves.id,
      san: moves.san,
      uci: moves.uci,
      moveNumber: moves.moveNumber,
      colorToMove: moves.colorToMove,
      moveType: moves.moveType,
      parentPositionId: moves.parentPositionId,
      childPositionId: moves.childPositionId,
      state: reviewCards.state,
      due: reviewCards.due,
      stability: reviewCards.stability,
      difficulty: reviewCards.difficulty,
      reps: reviewCards.reps,
      lapses: reviewCards.lapses,
      chapterId: moves.chapterId,
    })
    .from(reviewCards)
    .innerJoin(moves, eq(moves.id, reviewCards.moveId))
    .where(and(...conditions))
    .orderBy(
      asc(reviewCards.state), // learning (state 1) before review (state 2)
      asc(reviewCards.due),
    )
    .limit(limit);

  // New cards (state 0, due <= now — already created with due=now)
  const newConditions = [
    eq(reviewCards.userId, userId),
    eq(reviewCards.state, 0),
    lte(reviewCards.due, now),
  ];
  if (chapterFilter) {
    newConditions.push(inArray(moves.chapterId, chapterFilter));
  }

  const newRows = await db
    .select({
      cardId: reviewCards.id,
      moveId: moves.id,
      san: moves.san,
      uci: moves.uci,
      moveNumber: moves.moveNumber,
      colorToMove: moves.colorToMove,
      moveType: moves.moveType,
      parentPositionId: moves.parentPositionId,
      childPositionId: moves.childPositionId,
      state: reviewCards.state,
      due: reviewCards.due,
      stability: reviewCards.stability,
      difficulty: reviewCards.difficulty,
      reps: reviewCards.reps,
      lapses: reviewCards.lapses,
      chapterId: moves.chapterId,
    })
    .from(reviewCards)
    .innerJoin(moves, eq(moves.id, reviewCards.moveId))
    .where(and(...newConditions))
    .orderBy(asc(moves.sortOrder))
    .limit(newCardLimit);

  // Merge: overdue first, then new
  const seen = new Set<string>();
  const merged: typeof dueRows = [];
  for (const row of [...dueRows, ...newRows]) {
    if (!seen.has(row.cardId)) {
      seen.add(row.cardId);
      merged.push(row);
    }
  }

  if (merged.length === 0) return [];

  // Fetch position FENs and course info
  const posIds = new Set<string>();
  const chapIds = new Set<string>();
  for (const r of merged) {
    posIds.add(r.parentPositionId);
    posIds.add(r.childPositionId);
    chapIds.add(r.chapterId);
  }

  const posRows = await db
    .select()
    .from(positions)
    .where(inArray(positions.id, Array.from(posIds)));
  const posMap = new Map(posRows.map((p) => [p.id, p]));

  const chapRows = await db
    .select({ id: chapters.id, name: chapters.name, courseId: chapters.courseId })
    .from(chapters)
    .where(inArray(chapters.id, Array.from(chapIds)));
  const chapMap = new Map(chapRows.map((c) => [c.id, c]));

  const courseIdsNeeded = new Set(chapRows.map((c) => c.courseId));
  const courseRows = await db
    .select({ id: courses.id, name: courses.name, color: courses.color })
    .from(courses)
    .where(inArray(courses.id, Array.from(courseIdsNeeded)));
  const courseMap = new Map(courseRows.map((c) => [c.id, c]));

  return merged.map((r) => {
    const parent = posMap.get(r.parentPositionId);
    const child = posMap.get(r.childPositionId);
    const chapter = chapMap.get(r.chapterId);
    const course = chapter ? courseMap.get(chapter.courseId) : undefined;
    return {
      cardId: r.cardId,
      moveId: r.moveId,
      san: r.san,
      uci: r.uci,
      moveNumber: r.moveNumber,
      colorToMove: r.colorToMove as 'white' | 'black',
      moveType: r.moveType as 'repertoire' | 'opponent' | 'alternative',
      parentFen: parent?.fen ?? '',
      childFen: child?.fen ?? '',
      parentPositionId: r.parentPositionId,
      childPositionId: r.childPositionId,
      annotation: parent?.annotation ?? null,
      courseName: course?.name ?? '',
      courseColor: (course?.color ?? 'white') as 'white' | 'black',
      chapterName: chapter?.name ?? '',
      state: r.state,
      due: r.due!,
      stability: r.stability,
      difficulty: r.difficulty,
      reps: r.reps,
      lapses: r.lapses,
    };
  });
}

export async function applyRating(
  userId: string,
  cardId: string,
  rating: Grade,
  responseTimeMs: number,
): Promise<void> {
  const rows = await db
    .select()
    .from(reviewCards)
    .where(and(eq(reviewCards.id, cardId), eq(reviewCards.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error('Card not found');

  const card: Card = {
    due: row.due!,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: 0,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as 0 | 1 | 2 | 3,
    last_review: row.lastReview ?? undefined,
  };

  const now = new Date();
  const result = scheduleCard(card, rating as Grade, now);
  const updated = result.card;

  await db
    .update(reviewCards)
    .set({
      due: updated.due,
      stability: updated.stability,
      difficulty: updated.difficulty,
      elapsedDays: updated.elapsed_days,
      scheduledDays: updated.scheduled_days,
      reps: updated.reps,
      lapses: updated.lapses,
      state: updated.state,
      lastReview: now,
    })
    .where(eq(reviewCards.id, cardId));

  await db.insert(reviewLogs).values({
    id: nanoid(12),
    cardId,
    rating,
    responseTimeMs,
    reviewedAt: now,
    prevStability: card.stability,
    prevDifficulty: card.difficulty,
    prevState: card.state,
  });
}

export async function getTrainingStats(userId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStartUnix = Math.floor(todayStart.getTime() / 1000);

  const [totalResult] = await db
    .select({ count: count() })
    .from(reviewCards)
    .where(eq(reviewCards.userId, userId));

  const [dueNowResult] = await db
    .select({ count: count() })
    .from(reviewCards)
    .where(and(eq(reviewCards.userId, userId), lte(reviewCards.due, now)));

  const [newResult] = await db
    .select({ count: count() })
    .from(reviewCards)
    .where(and(eq(reviewCards.userId, userId), eq(reviewCards.state, 0)));

  const [reviewedTodayResult] = await db
    .select({ count: count() })
    .from(reviewLogs)
    .innerJoin(reviewCards, eq(reviewCards.id, reviewLogs.cardId))
    .where(
      and(
        eq(reviewCards.userId, userId),
        sql`${reviewLogs.reviewedAt} >= ${todayStartUnix}`,
      ),
    );

  const [correctTodayResult] = await db
    .select({ count: count() })
    .from(reviewLogs)
    .innerJoin(reviewCards, eq(reviewCards.id, reviewLogs.cardId))
    .where(
      and(
        eq(reviewCards.userId, userId),
        sql`${reviewLogs.reviewedAt} >= ${todayStartUnix}`,
        sql`${reviewLogs.rating} >= ${Rating.Good}`,
      ),
    );

  const totalCards = totalResult?.count ?? 0;
  const dueNow = dueNowResult?.count ?? 0;
  const newCards = newResult?.count ?? 0;
  const reviewedToday = reviewedTodayResult?.count ?? 0;
  const correctToday = correctTodayResult?.count ?? 0;
  const accuracyToday = reviewedToday > 0 ? Math.round((correctToday / reviewedToday) * 100) : 0;

  return {
    totalCards,
    dueNow,
    newCards,
    reviewedToday,
    correctToday,
    accuracyToday,
  };
}
