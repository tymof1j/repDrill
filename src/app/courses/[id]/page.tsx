import { notFound, redirect } from 'next/navigation';
import { inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { positions, moves } from '@/lib/db/schema';
import { getCourse, listChapters } from '@/lib/course/queries';
import { normalizeFen } from '@/lib/chess/fen';
import { CourseDetailClient } from './CourseDetailClient';

const STARTING_FEN_NORMALIZED = normalizeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const course = await getCourse(session.user.id, id);
  if (!course) notFound();

  const chapters = await listChapters(id);
  const chapterIds = chapters.map((c) => c.id);

  const allMoves =
    chapterIds.length === 0
      ? []
      : await db.select().from(moves).where(inArray(moves.chapterId, chapterIds));

  const referencedPositionIds = new Set<string>();
  for (const m of allMoves) {
    referencedPositionIds.add(m.parentPositionId);
    referencedPositionIds.add(m.childPositionId);
  }

  const allPositions =
    referencedPositionIds.size === 0
      ? []
      : await db
          .select()
          .from(positions)
          .where(inArray(positions.id, Array.from(referencedPositionIds)));

  const rootPosition = allPositions.find((p) => p.fen === STARTING_FEN_NORMALIZED);
  const chaptersById = new Map(chapters.map((c) => [c.id, c]));

  const viewerPositions = allPositions.map((p) => ({
    id: p.id,
    fen: p.fen,
    annotation: p.annotation,
  }));

  const viewerMoves = allMoves.map((m) => ({
    id: m.id,
    parentPositionId: m.parentPositionId,
    childPositionId: m.childPositionId,
    san: m.san,
    uci: m.uci,
    moveNumber: m.moveNumber,
    colorToMove: m.colorToMove,
    isMainLine: m.isMainLine,
    moveType: m.moveType,
    chapterId: m.chapterId,
    chapterName: chaptersById.get(m.chapterId)?.name ?? '',
  }));

  return (
    <CourseDetailClient
      course={{ id: course.id, name: course.name, color: course.color, description: course.description }}
      chapters={chapters.map((c) => ({ id: c.id, name: c.name }))}
      rootPositionId={rootPosition?.id ?? ''}
      positions={viewerPositions}
      moves={viewerMoves}
    />
  );
}
