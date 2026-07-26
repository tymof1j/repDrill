import type { Metadata } from 'next';
import Link from 'next/link';
import { DocLayout } from '../DocLayout';

export const metadata: Metadata = {
  title: 'Woodpecker book methods — FAQ · RepDrill',
  description:
    'How RepDrill implements the authors’ recommended training cadence for The Woodpecker Method and The Woodpecker Method 2.',
};

const sections = [
  { id: 'shared-cadence', label: 'Shared cadence' },
  { id: 'book-one', label: 'Book one' },
  { id: 'book-two', label: 'Book two' },
  { id: 'controls', label: 'RepDrill controls' },
];

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--ink-soft)] md:text-base">
      {children}
    </p>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="mt-5 divide-y divide-[color:var(--paper-rule)] border-y border-[color:var(--paper-rule)]">
      {items.map((item, index) => (
        <li key={item} className="grid gap-3 py-4 md:grid-cols-[3rem_1fr]">
          <span className="font-mono text-[11px] font-semibold text-[color:var(--library-green)]">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
            {item}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function WoodpeckerMethodDocumentationPage() {
  return (
    <DocLayout sections={sections}>
      <header className="mb-8 border-b border-[color:var(--paper-rule)] pb-6">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">
          Book methods
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)] md:text-4xl">
          How to use both Woodpecker courses
        </h1>
        <Para>
          These courses are not intended as one-pass puzzle collections. Their central idea is
          to repeat the same set until recognition and decision-making become fast. RepDrill
          follows that method by default.
        </Para>
      </header>

      <h2 id="shared-cadence" className="mt-10 scroll-mt-20 font-display text-2xl font-semibold tracking-[-0.01em]">
        The shared seven-cycle cadence
      </h2>
      <Steps
        items={[
          'Choose a fixed set and solve it in order. If you are stuck, still commit to a move as you would in a game.',
          'Complete cycle one in about four weeks, then rest for at least one clear day and no more than a week.',
          'Complete the same set again in about two weeks.',
          'Keep repeating the same positions and aim to roughly halve the number of days each cycle.',
          'Finish after the seventh cycle, or when the whole set fits into one focused day. In the final cycles, pattern recognition matters more than exhaustive calculation.',
        ]}
      />
      <Para>
        The authors consider 5–10 focused hours per week realistic for a working amateur.
        Time and number of positions are more useful measures than a complicated points system.
      </Para>

      <h2 id="book-one" className="mt-12 scroll-mt-20 font-display text-2xl font-semibold tracking-[-0.01em]">
        The Woodpecker Method: tactical fluency
      </h2>
      <Para>
        RepDrill starts with a 250-position set, matching the book’s practical recommendation
        for a working amateur. More ambitious players can extend the set toward 1,000 or all
        1,128 positions; the hardest section is deliberately not the default.
      </Para>
      <Para>
        Seeing the motif is not enough. In cycles one through five, calculate the critical
        continuation and check the opponent’s resources before moving. Cycles six and seven
        shift toward immediate recognition, while still checking the key line. The optional
        book scoring awards a point for the first move and each marked critical continuation,
        but RepDrill keeps pace and completion as the primary feedback.
      </Para>

      <h2 id="book-two" className="mt-12 scroll-mt-20 font-display text-2xl font-semibold tracking-[-0.01em]">
        The Woodpecker Method 2: positional decisions
      </h2>
      <Para>
        The default set is the 296 Public Education priyomes. You can extend it to exercise 339,
        545, or ultimately all 1,000. A positional answer must still be a concrete move: identify
        the plan, calculate the relevant tactics, and commit.
      </Para>
      <Para>
        During the first two cycles, spend as much time as needed to understand the author’s
        explanation—not only the first move. From the second cycle onward, familiar positions
        can be checked more quickly; later cycles prioritize pace. The book suggests one point
        for the exact solution or half a point when the main idea is right but its support is
        incomplete. RepDrill describes a mismatch as a comparison with the author’s move,
        because some positional positions admit more than one playable idea.
      </Para>

      <h2 id="controls" className="mt-12 scroll-mt-20 font-display text-2xl font-semibold tracking-[-0.01em]">
        What the setting changes
      </h2>
      <Para>
        With author guidance enabled, RepDrill keeps the course ordered, tracks the current
        cycle and target pace, uses the recommended starter set, and changes its review prompt
        between early and late cycles. Disable either method in one click to restore random
        access and remove cycle guidance. Your solved-position history is preserved.
      </Para>
      <Link
        href="/settings#book-methods"
        className="mt-6 inline-flex border-b border-[color:var(--library-green)] pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--library-green)]"
      >
        Open book method settings →
      </Link>
    </DocLayout>
  );
}
