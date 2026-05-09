import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import {
  getCourseByShareToken,
  loadPublicCourseData,
} from '@/lib/course/share';
import { normalizeFen } from '@/lib/chess/fen';
import { AppSurface, PageHeader, BackLink } from '@/components/ui/Premium';
import { SharePublicView } from './SharePublicView';

const STARTING_FEN_NORMALIZED = normalizeFen(
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
);

export default async function SharedCoursePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const course = await getCourseByShareToken(token);
  if (!course) notFound();

  const data = await loadPublicCourseData(course.id);
  const rootPosition = data.positions.find((p) => p.fen === STARTING_FEN_NORMALIZED);
  const chaptersById = new Map(data.chapters.map((c) => [c.id, c]));

  const session = await auth();

  return (
    <AppSurface>
      <BackLink href="/">Home</BackLink>
      <PageHeader
        eyebrow={`Shared course · ${course.color}`}
        title={course.name}
        body={course.description ?? 'A shared opening repertoire — read-only view.'}
      />

      <SharePublicView
        course={{ id: course.id, name: course.name, color: course.color as 'white' | 'black' }}
        chapters={data.chapters.map((c) => ({ id: c.id, name: c.name }))}
        rootPositionId={rootPosition?.id ?? ''}
        positions={data.positions.map((p) => ({
          id: p.id,
          fen: p.fen,
          annotation: p.annotation,
        }))}
        moves={data.moves.map((m) => ({
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
        }))}
        viewerIsAuthed={!!session?.user?.id}
      />
    </AppSurface>
  );
}
