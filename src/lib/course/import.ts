import 'server-only';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { positions, moves } from '@/lib/db/schema';
import type { ImportedTree } from '@/lib/chess/tree';
import { serializeMoveAnnotations } from '@/lib/chess/pgn-parser';

/** Insert positions (deduped by userId+fen) and moves for an imported tree. */
export async function importTreeIntoChapter(params: {
  userId: string;
  chapterId: string;
  courseColor: 'white' | 'black';
  tree: ImportedTree;
}): Promise<{ positionsCreated: number; movesCreated: number; movesSkipped: number }> {
  const { userId, chapterId, courseColor, tree } = params;

  const fenToId = new Map<string, string>();
  const annotationByFen = new Map<string, string>();

  const upsertPosition = async (fen: string, annotation?: string): Promise<string> => {
    const cached = fenToId.get(fen);
    if (cached) {
      if (annotation) {
        const previous = annotationByFen.get(fen) ?? '';
        const merged = previous && !previous.includes(annotation) ? `${previous}\n\n${annotation}` : (previous || annotation);
        if (merged !== previous) {
          annotationByFen.set(fen, merged);
          await db.update(positions).set({ annotation: merged }).where(eq(positions.id, cached));
        }
      }
      return cached;
    }

    const existing = await db
      .select({ id: positions.id, annotation: positions.annotation })
      .from(positions)
      .where(and(eq(positions.userId, userId), eq(positions.fen, fen)))
      .limit(1);

    if (existing[0]) {
      if (existing[0].annotation) annotationByFen.set(fen, existing[0].annotation);
      if (annotation) {
        const previous = existing[0].annotation ?? '';
        const merged = previous && !previous.includes(annotation) ? `${previous}\n\n${annotation}` : (previous || annotation);
        if (merged !== previous) {
          await db.update(positions).set({ annotation: merged }).where(eq(positions.id, existing[0].id));
          annotationByFen.set(fen, merged);
        }
      }
      fenToId.set(fen, existing[0].id);
      return existing[0].id;
    }

    const id = nanoid(12);
    await db.insert(positions).values({ id, userId, fen, annotation: annotation ?? null });
    if (annotation) annotationByFen.set(fen, annotation);
    fenToId.set(fen, id);
    return id;
  };

  let positionsCreated = 0;
  let movesCreated = 0;
  let movesSkipped = 0;

  const rootBefore = fenToId.size;
  await upsertPosition(tree.rootFen);
  if (fenToId.size > rootBefore) positionsCreated++;

  for (const [index, mv] of tree.moves.entries()) {
    const before = fenToId.size;
    const parentId = await upsertPosition(mv.parentFen);
    const structured = serializeMoveAnnotations(mv.annotations);
    const annotation = [mv.comment, structured].filter(Boolean).join(' ').trim() || undefined;
    const childId = await upsertPosition(mv.fen, annotation);
    positionsCreated += fenToId.size - before;

    const dup = await db
      .select({ id: moves.id })
      .from(moves)
      .where(
        and(
          eq(moves.chapterId, chapterId),
          eq(moves.parentPositionId, parentId),
          eq(moves.san, mv.san),
        ),
      )
      .limit(1);
    if (dup[0]) {
      movesSkipped++;
      continue;
    }

    const colorThatMoved: 'white' | 'black' = mv.colorToMove === 'white' ? 'black' : 'white';
    const moveType = colorThatMoved === courseColor ? 'repertoire' : 'opponent';

    await db.insert(moves).values({
      id: nanoid(12),
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

  return { positionsCreated, movesCreated, movesSkipped };
}
