import 'server-only';
import { nanoid } from 'nanoid';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courses, chapters, positions, moves } from '@/lib/db/schema';

export async function getCourseByShareToken(token: string) {
  const rows = await db
    .select()
    .from(courses)
    .where(and(eq(courses.shareToken, token), eq(courses.isPublic, true)))
    .limit(1);
  return rows[0] ?? null;
}

/** Load full read-only data for a public course (no userId scoping needed once we
 *  have the course; positions are owned by the *author*, but we only return positions
 *  referenced by this course's moves, so no other data leaks). */
export async function loadPublicCourseData(courseId: string) {
  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.courseId, courseId))
    .orderBy(chapters.sortOrder, chapters.createdAt);

  const chapterIds = chapterRows.map((c) => c.id);
  const moveRows =
    chapterIds.length === 0
      ? []
      : await db.select().from(moves).where(inArray(moves.chapterId, chapterIds));

  const referencedIds = new Set<string>();
  for (const m of moveRows) {
    referencedIds.add(m.parentPositionId);
    referencedIds.add(m.childPositionId);
  }
  const positionRows =
    referencedIds.size === 0
      ? []
      : await db
          .select()
          .from(positions)
          .where(inArray(positions.id, Array.from(referencedIds)));

  return { chapters: chapterRows, moves: moveRows, positions: positionRows };
}

/** Deep-copy a public source course into a target user's account.
 *  - Creates a new `courses` row owned by `targetUserId`.
 *  - Copies chapters with same names/sortOrder.
 *  - Copies moves; positions are deduped by (targetUserId, fen). */
export async function copyCourseToUser(params: {
  sourceCourseId: string;
  targetUserId: string;
  newName?: string;
}): Promise<string> {
  const { sourceCourseId, targetUserId, newName } = params;

  const sourceRows = await db
    .select()
    .from(courses)
    .where(eq(courses.id, sourceCourseId))
    .limit(1);
  const source = sourceRows[0];
  if (!source) throw new Error('Source course not found');
  if (!source.isPublic) throw new Error('Source course is not public');

  const data = await loadPublicCourseData(sourceCourseId);

  // Pre-load source positions to get FEN -> annotation
  const sourcePositionById = new Map(data.positions.map((p) => [p.id, p]));

  const newCourseId = nanoid(12);
  const now = new Date();
  await db.insert(courses).values({
    id: newCourseId,
    userId: targetUserId,
    name: newName?.trim() || `${source.name} (copy)`,
    color: source.color,
    description: source.description ?? null,
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  });

  // Map source positionId -> target positionId, deduped by (targetUserId, fen).
  const idMap = new Map<string, string>();
  for (const p of data.positions) {
    const existing = await db
      .select({ id: positions.id })
      .from(positions)
      .where(and(eq(positions.userId, targetUserId), eq(positions.fen, p.fen)))
      .limit(1);
    if (existing[0]) {
      idMap.set(p.id, existing[0].id);
      continue;
    }
    const newId = nanoid(12);
    await db.insert(positions).values({
      id: newId,
      userId: targetUserId,
      fen: p.fen,
      annotation: p.annotation ?? null,
    });
    idMap.set(p.id, newId);
  }

  for (const ch of data.chapters) {
    const newChapterId = nanoid(12);
    await db.insert(chapters).values({
      id: newChapterId,
      courseId: newCourseId,
      name: ch.name,
      sortOrder: ch.sortOrder,
      description: ch.description ?? null,
      createdAt: now,
    });

    for (const m of data.moves.filter((mv) => mv.chapterId === ch.id)) {
      const parentId = idMap.get(m.parentPositionId);
      const childId = idMap.get(m.childPositionId);
      if (!parentId || !childId) continue;
      void sourcePositionById; // silence unused
      await db.insert(moves).values({
        id: nanoid(12),
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
    }
  }

  return newCourseId;
}

export function generateShareToken(): string {
  return nanoid(12);
}
