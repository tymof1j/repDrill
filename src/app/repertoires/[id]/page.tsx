import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listCourses } from '@/lib/course/queries';
import { getRepertoire, loadRepertoireTree } from '@/lib/repertoire/queries';
import { normalizeFen } from '@/lib/chess/fen';
import {
  MergedRepertoireViewer,
  type MergedMove,
  type MergedPosition,
  type MergedChoice,
} from '@/components/repertoire/MergedRepertoireViewer';
import {
  AppSurface,
  BackLink,
  EmptyState,
  FieldLabel,
  PageHeader,
  PremiumButton,
  PremiumPanel,
  SecondaryButton,
  fieldClassName,
} from '@/components/ui/Premium';
import {
  addCourseToRepertoireAction,
  removeCourseFromRepertoireAction,
} from '../actions';

const STARTING_FEN_NORMALIZED = normalizeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

export default async function RepertoireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const repertoire = await getRepertoire(session.user.id, id);
  if (!repertoire) notFound();

  const tree = await loadRepertoireTree(id);
  const allUserCourses = await listCourses(session.user.id);

  const includedCourseIds = new Set(tree.courses.map((c) => c.course.id));
  const availableCourses = allUserCourses.filter((c) => !includedCourseIds.has(c.id));

  const chaptersById = new Map(tree.chapters.map((c) => [c.id, c]));
  const coursesById = new Map(tree.courses.map((c) => [c.course.id, c.course]));

  const viewerPositions: MergedPosition[] = tree.positions.map((p) => ({
    id: p.id,
    fen: p.fen,
    annotation: p.annotation,
  }));

  const viewerMoves: MergedMove[] = tree.moves.flatMap((m) => {
    const chapter = chaptersById.get(m.chapterId);
    if (!chapter) return [];
    const course = coursesById.get(chapter.courseId);
    if (!course) return [];
    return [
      {
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
        chapterName: chapter.name,
        courseId: course.id,
        courseName: course.name,
        courseColor: course.color as 'white' | 'black',
      },
    ];
  });

  const rootPosition = tree.positions.find((p) => p.fen === STARTING_FEN_NORMALIZED);

  const viewerChoices: MergedChoice[] = tree.choices.map((c) => ({
    positionId: c.positionId,
    preferredMoveId: c.preferredMoveId,
  }));

  return (
    <AppSurface>
      <BackLink href="/repertoires">Repertoires</BackLink>
      <PageHeader
        eyebrow="Merged repertoire"
        title={repertoire.name}
        body={repertoire.description ?? 'Resolve overlapping course theory and inspect the combined move tree.'}
      />

      <PremiumPanel className="mb-8">
        <div className="p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f846d]">
                Included courses
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#fff8e6]">{tree.courses.length} active</h2>
            </div>
            {availableCourses.length === 0 && tree.courses.length > 0 && (
              <Link
                href="/courses/new"
                className="text-sm font-semibold text-[#c8b68c] transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-[#fff8e6]"
              >
                Create another course
              </Link>
            )}
          </div>

          {tree.courses.length === 0 ? (
            <p className="text-sm leading-6 text-[#b9af98]">
              No courses added yet. Add one below to start building this repertoire.
            </p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {tree.courses.map((c) => (
                <li key={c.course.id} className="rounded-[1.4rem] bg-[#f8f1df]/[0.06] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#fff8e6]">{c.course.name}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8f846d]">
                        {c.course.color}
                      </p>
                    </div>
                    <form action={removeCourseFromRepertoireAction}>
                      <input type="hidden" name="repertoireId" value={id} />
                      <input type="hidden" name="courseId" value={c.course.id} />
                      <SecondaryButton type="submit" className="px-4 py-2 text-xs">
                        Remove
                      </SecondaryButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {availableCourses.length > 0 && (
            <form action={addCourseToRepertoireAction} className="mt-6 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <input type="hidden" name="repertoireId" value={id} />
              <FieldLabel label="Add course">
                <select name="courseId" required className={fieldClassName}>
                  {availableCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.color})
                    </option>
                  ))}
                </select>
              </FieldLabel>
              <PremiumButton type="submit">Add</PremiumButton>
            </form>
          )}

          {availableCourses.length === 0 && tree.courses.length === 0 && (
            <p className="mt-4 text-sm text-[#a99f89]">
              You do not have any courses yet.{' '}
              <Link href="/courses/new" className="text-[#d7b46a] hover:text-[#fff8e6]">
                Create one
              </Link>
              .
            </p>
          )}
        </div>
      </PremiumPanel>

      {tree.courses.length > 0 ? (
        <MergedRepertoireViewer
          repertoireId={id}
          rootPositionId={rootPosition?.id ?? ''}
          positions={viewerPositions}
          moves={viewerMoves}
          choices={viewerChoices}
        />
      ) : (
        <EmptyState>Add a course to unlock the merged repertoire viewer.</EmptyState>
      )}
    </AppSurface>
  );
}
