import { notFound } from 'next/navigation';
import { convexAuthNextjsToken, isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/_generated/api';
import { AppSurface, PageHeader, BackLink } from '@/components/ui/Premium';
import { SharedAnalysisView } from './SharedAnalysisView';
import { SharePublicView } from './SharePublicView';
import { normalizeFen } from '@/lib/chess/fen';
import {
  MergedRepertoireViewer,
  type MergedChoice,
  type MergedMove,
  type MergedPosition,
} from '@/components/repertoire/MergedRepertoireViewer';

export default async function SharedCoursePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const authToken = await convexAuthNextjsToken();
  const data = await fetchQuery(
    api.courses.getPublicByToken,
    { token },
    authToken ? { token: authToken } : undefined,
  );
  if (!data) {
    const repertoireData = await fetchQuery(
      api.repertoires.getPublicByToken,
      { token },
      authToken ? { token: authToken } : undefined,
    );
    if (!repertoireData) {
      const analysisData = await fetchQuery(
        api.analyze.getPublicByToken,
        { token },
        authToken ? { token: authToken } : undefined,
      );
      if (!analysisData) notFound();

      const { game } = analysisData;
      const gameRow = {
        id: game._id,
        source: game.source,
        gameId: game.gameId,
        url: game.url,
        whiteUsername: game.whiteUsername,
        blackUsername: game.blackUsername,
        result: game.result,
        playedAt: new Date(game.playedAt).toISOString(),
        opening: game.opening,
        timeControl: game.timeControl,
        pgn: game.pgn,
        deviation: {
          kind: game.deviationKind,
          playedAs: game.playedAs,
          deviationMoveNumber: game.deviationMoveNumber,
          deviationPly: game.deviationPly,
          playedSan: game.playedSan,
          expectedSans: game.expectedSans,
          deviationFen: game.deviationFen,
          deviationPositionId: game.deviationPositionId,
          totalPlies: game.totalPlies,
        },
      };

      return (
        <AppSurface>
          <BackLink href="/">Home</BackLink>
          <PageHeader
            eyebrow="Shared analysis"
            title={`${game.whiteUsername} vs ${game.blackUsername}`}
            body={game.opening ?? 'Game analysis shared via RepDrill.'}
          />
          <SharedAnalysisView game={gameRow} />
        </AppSurface>
      );
    }

    const chaptersById = new Map(repertoireData.chapters.map((chapter) => [chapter._id as string, chapter]));
    const coursesById = new Map(repertoireData.courses.map((entry) => [entry.course._id as string, entry.course]));
    const rootPosition = repertoireData.positions.find(
      (position) => position.fen === normalizeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
    );
    const viewerPositions: MergedPosition[] = repertoireData.positions.map((position) => ({
      id: position._id as string,
      fen: position.fen,
      annotation: position.annotation ?? null,
    }));
    const viewerMoves: MergedMove[] = repertoireData.moves.flatMap((move) => {
      const chapter = chaptersById.get(move.chapterId as string);
      if (!chapter) return [];
      const course = coursesById.get(chapter.courseId as string);
      if (!course) return [];
      return [{
        id: move._id as string,
        parentPositionId: move.parentPositionId as string,
        childPositionId: move.childPositionId as string,
        san: move.san,
        uci: move.uci,
        moveNumber: move.moveNumber,
        colorToMove: move.colorToMove,
        isMainLine: move.isMainLine,
        moveType: move.moveType,
        chapterId: move.chapterId as string,
        chapterName: chapter.name,
        courseId: course._id as string,
        courseName: course.name,
        courseColor: course.color,
      }];
    });
    const viewerChoices: MergedChoice[] = repertoireData.choices.map((choice) => ({
      positionId: choice.positionId as string,
      preferredMoveId: choice.preferredMoveId as string,
    }));

    return (
      <AppSurface>
        <BackLink href="/">Home</BackLink>
        <PageHeader
          eyebrow="Shared repertoire"
          title={repertoireData.repertoire.name}
          body={repertoireData.repertoire.description ?? 'A shared merged repertoire. Inspect the combined move tree from the linked courses.'}
        />
        <MergedRepertoireViewer
          repertoireId={repertoireData.repertoire._id}
          rootPositionId={(rootPosition?._id as string) ?? ''}
          positions={viewerPositions}
          moves={viewerMoves}
          choices={viewerChoices}
          readOnly
        />
      </AppSurface>
    );
  }

  const { course, chapters } = data;
  const isLoggedIn = await isAuthenticatedNextjs();

  const chapterTrees = await Promise.all(
    chapters.map((ch) =>
      fetchQuery(api.courses.getPublicChapterTree, { token, chapterId: ch._id }),
    ),
  );

  const chapterNameById = new Map(chapters.map((chapter) => [chapter._id, chapter.name]));

  let allMoves = chapterTrees.flatMap((t) => t?.moves ?? []);
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
  if (data.scopeType === 'line' && data.scopeId && rootPosition) {
    const byParent = new Map<string, typeof allMoves>();
    for (const move of allMoves) {
      const siblings = byParent.get(move.parentPositionId) ?? [];
      siblings.push(move);
      byParent.set(move.parentPositionId, siblings);
    }
    const pathIds = new Set<string>();
    const visit = (positionId: string, seen: Set<string>): boolean => {
      if (positionId === data.scopeId) return true;
      if (seen.has(positionId)) return false;
      seen.add(positionId);
      for (const move of byParent.get(positionId) ?? []) {
        if (visit(move.childPositionId, new Set(seen))) {
          pathIds.add(move._id);
          return true;
        }
      }
      return false;
    };
    visit(rootPosition._id, new Set());
    allMoves = allMoves.filter((move) => pathIds.has(move._id));
  }

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
        shareToken={token}
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
        access={data.access ?? 'copy'}
      />
    </AppSurface>
  );
}
