import { redirect } from 'next/navigation';
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server';
import {
  AppSurface,
  BackLink,
  PageHeader,
  Stamp,
} from '@/components/ui/Premium';
import {
  WOODPECKER_COURSE,
  woodpeckerPuzzles,
} from '@/lib/woodpecker';
import { WoodpeckerStartButton } from '../WoodpeckerStartButton';
import { WoodpeckerSectionCards } from './WoodpeckerSectionCards';

export default async function WoodpeckerCoursePage() {
  if (!(await isAuthenticatedNextjs())) redirect('/login');

  const playable = woodpeckerPuzzles.filter((puzzle) => puzzle.solutionUci.length > 0);

  return (
    <AppSurface>
      <BackLink href="/courses">Courses</BackLink>
      <PageHeader
        eyebrow="Puzzle course · Complete book"
        title={WOODPECKER_COURSE.name}
        body={WOODPECKER_COURSE.description}
        action={(
          <WoodpeckerStartButton
            bookKey="woodpecker-method"
            courseSlug="woodpecker"
            total={woodpeckerPuzzles.length}
            label="Start solving"
          />
        )}
      />

      <section className="mb-12 grid gap-4 border-y border-[color:var(--paper-rule)] py-6 sm:grid-cols-3">
        <CourseStat value={woodpeckerPuzzles.length} label="book positions" />
        <CourseStat value={playable.length} label="interactive solutions" />
        <CourseStat value="1860–2017" label="games represented" />
      </section>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Stamp tone="red">Puzzles</Stamp>
        <span className="text-sm text-[color:var(--ink-soft)]">
          {WOODPECKER_COURSE.author}
        </span>
        <span className="text-[color:var(--ink-ghost)]">·</span>
        <span className="text-sm text-[color:var(--ink-soft)]">
          Every position keeps its players, event, year, book page, and original explanation.
        </span>
      </div>

      <WoodpeckerSectionCards />
    </AppSurface>
  );
}

function CourseStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-semibold tracking-[-0.04em] text-[color:var(--margin-red)]">
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
        {label}
      </p>
    </div>
  );
}
