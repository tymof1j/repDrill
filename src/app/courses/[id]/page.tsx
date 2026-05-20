import { notFound, redirect } from 'next/navigation';
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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

  const chapters = await fetchQuery(api.courses.listChapters, { courseId: course._id }, { token });
  const lineStatuses = await fetchQuery(api.training.getCourseLineStatuses, { courseId: course._id }, { token });

  // Load each chapter's tree in parallel — each query is bounded by its
  // own chapter, avoiding the 32k document-read limit per query.
  const chapterTrees = await Promise.all(
    chapters.map((ch) =>
      fetchQuery(api.courses.getChapterTree, { chapterId: ch._id }, { token }),
    ),
  );

  const chapterNameById = new Map(chapters.map((chapter) => [chapter._id, chapter.name]));

  const allMoves = chapterTrees.flatMap((t) => t?.moves ?? []);
  const positionsById = new Map<string, { _id: string; fen: string; annotation?: string }>();
  for (const tree of chapterTrees) {
    for (const position of tree?.positions ?? []) {
      positionsById.set(position._id, position);
    }
  }
  const allPositions = Array.from(positionsById.values());

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
        description: course.description ?? null,
        isPublic: course.isPublic,
        shareToken: course.shareToken ?? null,
      }}
      chapters={chapters.map((c) => ({ id: c._id, name: c.name, chapterType: c.chapterType ?? 'training' }))}
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
