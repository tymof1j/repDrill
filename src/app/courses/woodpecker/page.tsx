import { redirect } from 'next/navigation';
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server';
import {
  AppSurface,
  BackLink,
  PageHeader,
  PremiumButton,
  PremiumPanel,
  SecondaryButton,
  Stamp,
} from '@/components/ui/Premium';
import {
  WOODPECKER_COURSE,
  getSectionRange,
  woodpeckerPuzzles,
} from '@/lib/woodpecker';

const sectionCopy = {
  easy: {
    title: 'Easy',
    body: 'Build speed and pattern recognition with compact combinations.',
  },
  intermediate: {
    title: 'Intermediate',
    body: 'Calculate deeper positions where the first move is less obvious.',
  },
  advanced: {
    title: 'Advanced',
    body: 'Longer, demanding combinations selected for serious calculation work.',
  },
} as const;

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
        action={<PremiumButton href="/train/puzzles/woodpecker?n=1">Start solving</PremiumButton>}
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

      <div className="grid gap-5 lg:grid-cols-3">
        {(['easy', 'intermediate', 'advanced'] as const).map((section) => {
          const range = getSectionRange(section);
          const copy = sectionCopy[section];
          return (
            <PremiumPanel key={section} innerClassName="flex h-full flex-col p-6 md:p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                Exercises {range.first}–{range.last}
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em]">
                {copy.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                {copy.body}
              </p>
              <div className="mt-7 flex items-center justify-between border-t border-[color:var(--paper-rule)] pt-5">
                <span className="font-mono text-xs text-[color:var(--ink-faint)]">
                  {range.count} positions
                </span>
                <SecondaryButton href={`/train/puzzles/woodpecker?n=${range.first}`}>
                  Open set
                </SecondaryButton>
              </div>
            </PremiumPanel>
          );
        })}
      </div>
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
