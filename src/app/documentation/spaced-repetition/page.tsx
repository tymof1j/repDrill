import type { Metadata } from 'next';
import Link from 'next/link';
import { DocLayout } from '../DocLayout';

export const metadata: Metadata = {
  title: 'Why spaced repetition — FAQ · RepDrill',
  description:
    'Why retrieval-with-spacing beats re-reading and bulk drilling for long-term retention of chess opening lines.',
};

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--ink-soft)] md:text-base">
      {children}
    </p>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-[color:var(--ink-soft)] md:text-base">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--paper-edge)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const sections = [
  { id: 'effects', label: 'The two effects' },
  { id: 'openings', label: 'Why this matters for openings' },
  { id: 'repdrill', label: 'What RepDrill does' },
  { id: 'further', label: 'Further reading' },
];

export default function SpacedRepetitionPage() {
  return (
    <DocLayout sections={sections}>
      <header className="mb-8 border-b border-[color:var(--paper-rule)] pb-6">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">
          Method
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)] md:text-4xl">
          Why spaced repetition
        </h1>
        <Para>
          The two cheapest things you can do to remember an opening line are testing yourself
          on it and spacing the tests out. Spaced repetition is just both, automated.
        </Para>
      </header>

      <h2 id="effects" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        The two effects, briefly
      </h2>
      <Para>
        Two findings dominate the cognitive-science literature on durable learning:
      </Para>
      <List
        items={[
          <>
            <strong>Testing effect.</strong> Pulling an answer out of your head leaves a stronger
            memory than reading the answer. The act of retrieval is itself the practice.
          </>,
          <>
            <strong>Spacing effect.</strong> Reviews separated by time produce far longer
            retention than the same number of reviews crammed together. The harder the recall
            (within reason), the more it strengthens the trace.
          </>,
        ]}
      />
      <Para>
        Together they imply a counter-intuitive rule: <em>study a line just before you would have
        forgotten it.</em> A correct recall at the edge of forgetting is worth multiple easy
        repetitions in a single sitting.
      </Para>

      <h2 id="openings" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        Why this matters for openings
      </h2>
      <Para>
        Opening prep has the worst possible memory profile: long branches, low natural exposure,
        high cost of forgetting on move 12. Re-reading PGNs feels productive — you recognize the
        moves — but recognition isn&apos;t recall. The first time you&apos;re on the clock against
        a real opponent, you discover the difference.
      </Para>
      <Para>
        Spaced repetition replaces &quot;I&apos;ll go over my Najdorf this weekend&quot; with a queue that
        surfaces exactly the lines that are about to fade. You spend the same hour and learn
        three times as much line.
      </Para>

      <h2 id="repdrill" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        What RepDrill does with this
      </h2>
      <List
        items={[
          <>
            Every drilled line is a card. Each correct/incorrect attempt updates that
            card&apos;s next-review date.
          </>,
          <>
            Lines you nail get pushed further out; lines you stumble on come back sooner. You
            don&apos;t pick what to study — the queue does.
          </>,
          <>
            The scheduler is <Link href="/documentation/fsrs" className="book-link text-[color:var(--ink)]">FSRS</Link>, which adapts the interval per card based on your actual recall pattern, not a fixed multiplier.
          </>,
        ]}
      />

      <h2 id="further" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        If you want to read further
      </h2>
      <List
        items={[
          <>Bjork, R. A. — &quot;desirable difficulties&quot; (the principle behind spacing and retrieval).</>,
          <>Karpicke &amp; Roediger (2008) — testing as a learning event, not an assessment.</>,
          <>SuperMemo &amp; Anki documentation — the practical lineage of spaced-repetition software.</>,
        ]}
      />
    </DocLayout>
  );
}
