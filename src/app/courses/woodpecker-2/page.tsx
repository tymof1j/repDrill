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
  WOODPECKER_2_COURSE,
  getWoodpecker2SectionRange,
  woodpecker2Puzzles,
  type Woodpecker2Puzzle,
} from '@/lib/woodpecker2';

const sections: Array<{
  key: Woodpecker2Puzzle['section'];
  title: string;
  eyebrow: string;
  body: string;
}> = [
  {
    key: 'public-education',
    title: 'Public Education',
    eyebrow: 'Priyomes',
    body: 'The core set recommended by the author: recurring positional plans and standard piece arrangements.',
  },
  {
    key: 'exam',
    title: 'Exam',
    eyebrow: 'Priyomes',
    body: 'A compact test of whether the first set has become usable knowledge.',
  },
  {
    key: 'academic',
    title: 'Academic Education',
    eyebrow: 'Priyomes',
    body: 'Broader and subtler examples for a larger first-cycle set.',
  },
  {
    key: 'medium',
    title: 'Medium',
    eyebrow: 'Rules of thumb',
    body: 'Practical decisions where one central positional principle points toward the move.',
  },
  {
    key: 'hard',
    title: 'Hard',
    eyebrow: 'Rules of thumb',
    body: 'Positions where plans compete and concrete calculation matters.',
  },
  {
    key: 'expert',
    title: 'Expert',
    eyebrow: 'Rules of thumb',
    body: 'The final twenty positions: a deliberately extreme positional challenge.',
  },
];

export default async function Woodpecker2CoursePage() {
  if (!(await isAuthenticatedNextjs())) redirect('/login');
  const playable = woodpecker2Puzzles.filter((puzzle) => puzzle.solutionUci.length > 0);

  return (
    <AppSurface>
      <BackLink href="/courses">Courses</BackLink>
      <PageHeader
        eyebrow="Positional puzzle course · Complete book"
        title={WOODPECKER_2_COURSE.name}
        body={WOODPECKER_2_COURSE.description}
        action={<PremiumButton href="/train/puzzles/woodpecker-2?n=1">Start the method</PremiumButton>}
      />

      <section className="mb-12 grid gap-4 border-y border-[color:var(--paper-rule)] py-6 sm:grid-cols-3">
        <CourseStat value={woodpecker2Puzzles.length} label="book positions" />
        <CourseStat value={playable.length} label="interactive positions" />
        <CourseStat value="7 cycles" label="author cadence" />
      </section>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Stamp tone="red">Positional puzzles</Stamp>
        <span className="text-sm text-[color:var(--ink-soft)]">{WOODPECKER_2_COURSE.author}</span>
        <span className="text-[color:var(--ink-ghost)]">·</span>
        <span className="text-sm text-[color:var(--ink-soft)]">
          The recommended first set is exercises 1–296, in order.
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const range = getWoodpecker2SectionRange(section.key);
          return (
            <PremiumPanel key={section.key} innerClassName="flex h-full flex-col p-6 md:p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                {section.eyebrow} · exercises {range.first}–{range.last}
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em]">
                {section.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                {section.body}
              </p>
              <div className="mt-7 flex items-center justify-between border-t border-[color:var(--paper-rule)] pt-5">
                <span className="font-mono text-xs text-[color:var(--ink-faint)]">
                  {range.count} positions
                </span>
                <SecondaryButton href={`/train/puzzles/woodpecker-2?n=${range.first}`}>
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

