import { notFound, redirect } from 'next/navigation';
import { convexAuthNextjsToken } from '@/lib/workos/convex-compat';
import { fetchQuery } from '@/lib/supabase/server-client';
import { api } from '@/lib/supabase/api';
import type { Id } from '@/lib/supabase/types';
import { CourseDetailClient } from './CourseDetailClient';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await convexAuthNextjsToken();
  if (!token) redirect('/login');

  const { id } = await params;
  const course = await fetchQuery(api.courses.get, { id: id as Id<"courses"> }, { token });
  if (!course) notFound();

  const [tree, lineStatuses] = await Promise.all([
    fetchQuery(api.courses.getTree, { courseId: course._id }, { token }),
    fetchQuery(api.training.getCourseLineStatuses, { courseId: course._id }, { token }),
  ]);
  if (!tree) notFound();
  const chapters = tree.chapters;
  const chapterNameById = new Map(chapters.map((chapter) => [chapter._id, chapter.name]));
  const allMoves = tree.moves;
  const allPositions = tree.positions;

  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
  const childIds = new Set(allMoves.map((m) => m.childPositionId as string));
  const rootPosition =
    allPositions.find((p) => p.fen === STARTING_FEN) ??
    allPositions.find((p) => !childIds.has(p._id)) ??
    null;

  return (
    <CourseDetailClient
      course={{
        id: course._id,
        name: course.name,
        color: course.color,
        trainingMode: course.trainingMode,
        description: course.description ?? null,
        isPublic: course.isPublic,
        shareToken: course.shareToken ?? null,
      }}
      chapters={chapters.map((c) => ({ id: c._id, name: c.name }))}
      rootPositionId={rootPosition?._id ?? ''}
      positions={allPositions.map((position) => ({
        id: position._id,
        fen: position.fen,
        annotation: position.annotation ?? null,
      }))}
      moves={allMoves.map((move) => ({
        id: move._id,
        chapterId: move.chapterId,
        parentPositionId: move.parentPositionId,
        childPositionId: move.childPositionId,
        san: move.san,
        uci: move.uci,
        moveNumber: move.moveNumber,
        colorToMove: move.colorToMove,
        isMainLine: move.isMainLine,
        moveType: move.moveType,
        chapterName: chapterNameById.get(move.chapterId) ?? '',
      }))}
      lineStatuses={lineStatuses}
    />
  );
}
