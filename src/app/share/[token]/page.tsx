import { notFound } from 'next/navigation';
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/_generated/api';
import { AppSurface, PageHeader, BackLink } from '@/components/ui/Premium';
import { SharePublicView } from './SharePublicView';

export default async function SharedCoursePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await fetchQuery(api.courses.getPublicByToken, { token });
  if (!data) notFound();

  const { course, chapters } = data;
  const isLoggedIn = await isAuthenticatedNextjs();

  const chapterTrees = await Promise.all(
    chapters.map((ch) =>
      fetchQuery(api.courses.getPublicChapterTree, { token, chapterId: ch._id }),
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
    <AppSurface>
      <BackLink href="/">Home</BackLink>
      <PageHeader
        eyebrow="Shared course"
        title={course.name}
        body={course.description ?? 'A read-only view of someone else’s repertoire. Copy lines into your own library.'}
      />
      <SharePublicView
        course={{ id: course._id, name: course.name, color: course.color }}
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
        viewerIsAuthed={isLoggedIn}
      />
    </AppSurface>
  );
}
