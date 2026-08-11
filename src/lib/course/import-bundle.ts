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
import { serializeMoveAnnotations } from '@/lib/chess/pgn-parser';
import type { PgnMoveAnnotations } from '@/lib/chess/pgn-parser';

type ImportedMove = ExportBundle['courses'][number]['chapters'][number]['moves'][number] & {
  comment?: string | null;
  annotations?: PgnMoveAnnotations | null;
};

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
    .select({ id: positions.id, fen: positions.fen, annotation: positions.annotation })
    .from(positions)
    .where(eq(positions.userId, targetUserId));
  const annotationByFen = new Map<string, string>();
  for (const p of existing) {
    fenToId.set(p.fen, p.id);
    if (p.annotation) annotationByFen.set(p.fen, p.annotation);
  }

  // Insert annotations for known FENs that the bundle has, plus new FENs.
  for (const p of bundle.positions) {
    if (p.annotation) {
      const previous = annotationByFen.get(p.fen);
      annotationByFen.set(p.fen, p.annotation);
      const existingId = fenToId.get(p.fen);
      if (existingId && !previous) {
        await db.update(positions).set({ annotation: p.annotation }).where(eq(positions.id, existingId));
      }
    }
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

      for (const m of ch.moves as ImportedMove[]) {
        const parentId = fenToId.get(m.parentFen);
        const childId = fenToId.get(m.childFen);
        if (!parentId || !childId) continue;
        const metadata = [m.comment ?? '', serializeMoveAnnotations(m.annotations ?? undefined)]
          .filter(Boolean)
          .join(' ')
          .trim();
        if (metadata) {
          const current = annotationByFen.get(m.childFen) ?? '';
          const merged = current && !current.includes(metadata) ? `${current}\n\n${metadata}` : (current || metadata);
          if (merged !== current) {
            annotationByFen.set(m.childFen, merged);
            await db.update(positions).set({ annotation: merged }).where(eq(positions.id, childId));
          }
        }
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
