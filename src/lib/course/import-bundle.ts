import 'server-only';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  courses,
  chapters,
  positions,
  moves,
  reviewCards,
  reviewLogs,
} from '@/lib/db/schema';
import type { ExportBundle } from './export';

export type ImportSummary = {
  coursesCreated: number;
  chaptersCreated: number;
  positionsCreated: number;
  movesCreated: number;
  cardsCreated: number;
  logsCreated: number;
};

/** Restore an export bundle for `targetUserId`. Positions are deduped by (userId, fen). */
export async function importBundle(
  targetUserId: string,
  bundle: ExportBundle,
): Promise<ImportSummary> {
  if (bundle.version !== 1) {
    throw new Error(`Unsupported bundle version: ${bundle.version}`);
  }

  const summary: ImportSummary = {
    coursesCreated: 0,
    chaptersCreated: 0,
    positionsCreated: 0,
    movesCreated: 0,
    cardsCreated: 0,
    logsCreated: 0,
  };

  // Pre-load existing positions to dedupe.
  const fenToId = new Map<string, string>();
  const existing = await db
    .select({ id: positions.id, fen: positions.fen })
    .from(positions)
    .where(eq(positions.userId, targetUserId));
  for (const p of existing) fenToId.set(p.fen, p.id);

  // Insert annotations for known FENs that the bundle has, plus new FENs.
  for (const p of bundle.positions) {
    if (fenToId.has(p.fen)) continue;
    const id = nanoid(12);
    await db.insert(positions).values({
      id,
      userId: targetUserId,
      fen: p.fen,
      annotation: p.annotation,
    });
    fenToId.set(p.fen, id);
    summary.positionsCreated++;
  }

  // Map of (parentFen + san) → newMoveId for FSRS card mapping.
  const moveKeyToId = new Map<string, string>();

  const now = new Date();
  for (const c of bundle.courses) {
    const newCourseId = nanoid(12);
    await db.insert(courses).values({
      id: newCourseId,
      userId: targetUserId,
      name: c.name,
      color: c.color,
      description: c.description,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });
    summary.coursesCreated++;

    for (const ch of c.chapters) {
      const newChapterId = nanoid(12);
      await db.insert(chapters).values({
        id: newChapterId,
        courseId: newCourseId,
        name: ch.name,
        sortOrder: ch.sortOrder,
        description: ch.description,
        createdAt: now,
      });
      summary.chaptersCreated++;

      for (const m of ch.moves) {
        const parentId = fenToId.get(m.parentFen);
        const childId = fenToId.get(m.childFen);
        if (!parentId || !childId) continue;
        const newMoveId = nanoid(12);
        await db.insert(moves).values({
          id: newMoveId,
          chapterId: newChapterId,
          parentPositionId: parentId,
          childPositionId: childId,
          san: m.san,
          uci: m.uci,
          moveNumber: m.moveNumber,
          colorToMove: m.colorToMove,
          isMainLine: m.isMainLine,
          moveType: m.moveType,
          sortOrder: m.sortOrder,
        });
        moveKeyToId.set(`${m.parentFen}::${m.san}`, newMoveId);
        summary.movesCreated++;
      }
    }
  }

  // Restore FSRS state.
  const cardKeyToId = new Map<string, string>();
  for (const c of bundle.reviewState) {
    const moveId = moveKeyToId.get(`${c.parentFen}::${c.moveSan}`);
    if (!moveId) continue;
    const cardId = nanoid(12);
    await db.insert(reviewCards).values({
      id: cardId,
      userId: targetUserId,
      moveId,
      due: new Date(c.due),
      stability: c.stability,
      difficulty: c.difficulty,
      elapsedDays: c.elapsedDays,
      scheduledDays: c.scheduledDays,
      reps: c.reps,
      lapses: c.lapses,
      state: c.state,
      lastReview: c.lastReview ? new Date(c.lastReview) : null,
    });
    cardKeyToId.set(`${c.parentFen}::${c.moveSan}`, cardId);
    summary.cardsCreated++;
  }

  for (const l of bundle.reviewLogs) {
    const cardId = cardKeyToId.get(l.cardKey);
    if (!cardId) continue;
    await db.insert(reviewLogs).values({
      id: nanoid(12),
      cardId,
      rating: l.rating,
      responseTimeMs: l.responseTimeMs,
      reviewedAt: new Date(l.reviewedAt),
      prevStability: l.prevStability,
      prevDifficulty: l.prevDifficulty,
      prevState: l.prevState,
    });
    summary.logsCreated++;
  }

  void and; // keep import for future scope filters
  return summary;
}
