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
  GhostButton,
  PageHeader,
  PremiumButton,
  Stamp,
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
        eyebrow="Volume · merged repertoire"
        title={repertoire.name}
        body={repertoire.description ?? 'Resolve overlapping course theory and inspect the combined move tree as a single bound preparation.'}
      />

      <section className="mb-12 border-y border-[color:var(--paper-edge)]">
        <div className="flex items-baseline justify-between gap-6 border-b border-[color:var(--paper-rule)] px-5 py-3 md:px-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Bound courses
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)] tabular-nums">
            {tree.courses.length} active
          </p>
        </div>

        {tree.courses.length === 0 ? (
          <p className="px-5 py-6 font-display-italic text-[15px] leading-relaxed text-[color:var(--ink-soft)] md:px-7">
            No courses added yet. Bind one below to start building this repertoire.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--paper-rule)]">
            {tree.courses.map((c) => (
              <li
                key={c.course.id}
                className="grid grid-cols-[1fr_auto] items-baseline gap-4 px-5 py-4 md:px-7"
              >
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-lg font-medium text-[color:var(--ink)]">
                    {c.course.name}
                  </h3>
                  <Stamp tone={c.course.color === 'white' ? 'ink' : 'red'}>
                    {c.course.color}
                  </Stamp>
                </div>
                <form action={removeCourseFromRepertoireAction}>
                  <input type="hidden" name="repertoireId" value={id} />
                  <input type="hidden" name="courseId" value={c.course.id} />
                  <GhostButton type="submit">Remove</GhostButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        {availableCourses.length > 0 && (
          <form
            action={addCourseToRepertoireAction}
            className="grid items-end gap-4 border-t border-[color:var(--paper-rule)] px-5 py-5 md:grid-cols-[1fr_auto] md:gap-6 md:px-7"
          >
            <input type="hidden" name="repertoireId" value={id} />
            <FieldLabel label="Bind another course">
              <select name="courseId" required className={fieldClassName}>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.color})
                  </option>
                ))}
              </select>
            </FieldLabel>
            <PremiumButton type="submit">Bind</PremiumButton>
          </form>
        )}

        {availableCourses.length === 0 && tree.courses.length === 0 && (
          <p className="border-t border-[color:var(--paper-rule)] px-5 py-5 font-display-italic text-[15px] text-[color:var(--ink-soft)] md:px-7">
            You have no courses yet.{' '}
            <Link href="/courses/new" className="book-link text-[color:var(--ink)] hover:text-[color:var(--margin-red)]">
              Create one
            </Link>
            .
          </p>
        )}
      </section>

      {tree.courses.length > 0 ? (
        <MergedRepertoireViewer
          repertoireId={id}
          rootPositionId={rootPosition?.id ?? ''}
          positions={viewerPositions}
          moves={viewerMoves}
          choices={viewerChoices}
        />
      ) : (
        <EmptyState>Bind at least one course to unlock the merged-repertoire viewer.</EmptyState>
      )}
    </AppSurface>
  );
}
