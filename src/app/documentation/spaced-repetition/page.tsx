import type { Metadata } from 'next';
import Link from 'next/link';
import { AppSurface, PageHeader, PremiumPanel } from '@/components/ui/Premium';

export const metadata: Metadata = {
  title: 'Why spaced repetition — Documentation · RepDrill',
  description:
    'Why retrieval-with-spacing beats re-reading and bulk drilling for long-term retention of chess opening lines.',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 mb-4 font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-3xl">
      {children}
    </h2>
  );
}

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

export default function SpacedRepetitionPage() {
  return (
    <AppSurface>
      <PageHeader
        eyebrow="Documentation — Method"
        title={
          <>
            Why <span className="font-display-italic">spaced</span> repetition.
          </>
        }
        body="The two cheapest things you can do to remember an opening line are testing yourself on it and spacing the tests out. Spaced repetition is just both, automated."
      />

      <PremiumPanel className="mb-10" innerClassName="px-6 py-7 md:px-10 md:py-9">
        <SectionTitle>The two effects, briefly</SectionTitle>
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

        <SectionTitle>Why this matters for openings</SectionTitle>
        <Para>
          Opening prep has the worst possible memory profile: long branches, low natural exposure,
          high cost of forgetting on move 12. Re-reading PGNs feels productive — you recognize the
          moves — but recognition isn&apos;t recall. The first time you&apos;re on the clock against
          a real opponent, you discover the difference.
        </Para>
        <Para>
          Spaced repetition replaces "I&apos;ll go over my Najdorf this weekend" with a queue that
          surfaces exactly the lines that are about to fade. You spend the same hour and learn
          three times as much line.
        </Para>

        <SectionTitle>What RepDrill does with this</SectionTitle>
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

        <SectionTitle>If you want to read further</SectionTitle>
        <List
          items={[
            <>Bjork, R. A. — &quot;desirable difficulties&quot; (the principle behind spacing and retrieval).</>,
            <>Karpicke &amp; Roediger (2008) — testing as a learning event, not an assessment.</>,
            <>SuperMemo &amp; Anki documentation — the practical lineage of spaced-repetition software.</>,
          ]}
        />
      </PremiumPanel>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/documentation"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[5px] transition-colors duration-200 hover:text-[color:var(--library-green)] hover:decoration-[color:var(--library-green)]"
        >
          ← All documentation
        </Link>
        <Link
          href="/documentation/fsrs"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[5px] transition-colors duration-200 hover:text-[color:var(--library-green)] hover:decoration-[color:var(--library-green)]"
        >
          Next — Why FSRS →
        </Link>
      </div>
    </AppSurface>
  );
}
