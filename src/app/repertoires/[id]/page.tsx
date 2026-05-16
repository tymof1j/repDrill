import { notFound, redirect } from 'next/navigation';
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { normalizeFen } from '@/lib/chess/fen';
import type { MergedMove, MergedPosition, MergedChoice } from '@/components/repertoire/MergedRepertoireViewer';
import { RepertoireDetailClient } from './RepertoireDetailClient';

const STARTING_FEN_NORMALIZED = normalizeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

export default async function RepertoireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await convexAuthNextjsToken();
  if (!token) redirect('/login');

  const { id } = await params;
  const repertoire = await fetchQuery(api.repertoires.get, { id: id as Id<"repertoires"> }, { token });
  if (!repertoire) notFound();

  const tree = await fetchQuery(api.repertoires.loadTree, { repertoireId: repertoire._id }, { token });
  const allUserCourses = await fetchQuery(api.courses.list, {}, { token });

  const includedCourseIds = new Set(tree.courses.map((c) => c.course._id));
  const availableCourses = allUserCourses.filter((c) => !includedCourseIds.has(c._id));

  const chaptersById = new Map(tree.chapters.map((c) => [c._id as string, c]));
  const coursesById = new Map(tree.courses.map((c) => [c.course._id as string, c.course]));

  const viewerPositions: MergedPosition[] = tree.positions.map((p) => ({
    id: p._id as string,
    fen: p.fen,
    annotation: p.annotation ?? null,
  }));

  const viewerMoves: MergedMove[] = tree.moves.flatMap((m) => {
    const chapter = chaptersById.get(m.chapterId as string);
    if (!chapter) return [];
    const course = coursesById.get(chapter.courseId as string);
    if (!course) return [];
    return [
      {
        id: m._id as string,
        parentPositionId: m.parentPositionId as string,
        childPositionId: m.childPositionId as string,
        san: m.san,
        uci: m.uci,
        moveNumber: m.moveNumber,
        colorToMove: m.colorToMove,
        isMainLine: m.isMainLine,
        moveType: m.moveType,
        chapterId: m.chapterId as string,
        chapterName: chapter.name,
        courseId: course._id as string,
        courseName: course.name,
        courseColor: course.color as 'white' | 'black',
      },
    ];
  });

  const rootPosition = tree.positions.find((p) => p.fen === STARTING_FEN_NORMALIZED);

  const viewerChoices: MergedChoice[] = tree.choices.map((c) => ({
    positionId: c.positionId as string,
    preferredMoveId: c.preferredMoveId as string,
  }));

  const shareScopes = [
    {
      type: 'resource' as const,
      label: 'Whole repertoire',
      description: 'Share the merged repertoire with every bound course.',
    },
    ...tree.courses.map((entry) => ({
      type: 'course' as const,
      id: entry.course._id as string,
      label: entry.course.name,
      description: `Only this ${entry.course.color} course from the repertoire.`,
    })),
  ];

  return (
    <RepertoireDetailClient
      repertoireId={id}
      repertoireName={repertoire.name}
      repertoireDescription={repertoire.description ?? null}
      boundCourses={tree.courses.map((c) => ({
        id: c.course._id as string,
        name: c.course.name,
        color: c.course.color as 'white' | 'black',
      }))}
      availableCourses={availableCourses.map((course) => ({
        id: course._id,
        name: course.name,
        color: course.color as 'white' | 'black',
      }))}
      shareScopes={shareScopes}
      rootPositionId={(rootPosition?._id as string) ?? ''}
      positions={viewerPositions}
      moves={viewerMoves}
      choices={viewerChoices}
    />
  );
}
