import type { Metadata } from 'next';
import Link from 'next/link';
import { AppSurface, PageHeader, PremiumPanel } from '@/components/ui/Premium';

export const metadata: Metadata = {
  title: 'Why FSRS — Documentation · RepDrill',
  description:
    'What the Free Spaced Repetition Scheduler does differently from SM-2 (Anki), and why RepDrill uses it for line scheduling.',
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

export default function FsrsPage() {
  return (
    <AppSurface>
      <PageHeader
        eyebrow="Documentation — Scheduler"
        title={
          <>
            Why <span className="font-display-italic">FSRS</span>.
          </>
        }
        body="FSRS — the Free Spaced Repetition Scheduler — is the algorithm that decides when to show each line again. RepDrill uses it instead of older schedulers like SM-2."
      />

      <PremiumPanel className="mb-10" innerClassName="px-6 py-7 md:px-10 md:py-9">
        <SectionTitle>The job of a scheduler</SectionTitle>
        <Para>
          A spaced-repetition scheduler answers one question per card: <em>given everything I know
          about how you&apos;ve recalled this card so far, when should I ask you again?</em> Pick
          intervals too short and you waste your time on already-known cards. Pick them too long
          and you forget before the next review.
        </Para>

        <SectionTitle>What SM-2 does</SectionTitle>
        <Para>
          SM-2 (the algorithm at the heart of Anki by default) keeps an &quot;ease factor&quot; per
          card and multiplies the previous interval by it: get it right, the next interval scales
          up by the ease; get it wrong, the card resets and the ease drops. It&apos;s simple, fast,
          and good enough — but it doesn&apos;t actually <em>model</em> memory. It encodes a few
          rules of thumb.
        </Para>
        <Para>
          The result is famous: Anki users hit &quot;ease hell,&quot; where stubborn cards keep
          coming back too often, and easy cards stretch out faster than retention can support.
        </Para>

        <SectionTitle>What FSRS does differently</SectionTitle>
        <List
          items={[
            <>
              <strong>It fits a memory model.</strong> Each card has three latent variables —
              difficulty, stability, retrievability — that follow a forgetting curve. The scheduler
              estimates them from your review history.
            </>,
            <>
              <strong>It targets a retention rate, not an ease multiplier.</strong> You can tell
              FSRS &quot;I want to remember ~90% of due cards on review.&quot; It chooses intervals
              that hit that target instead of multiplying by a fixed factor.
            </>,
            <>
              <strong>It learns from your data.</strong> The model parameters can be retrained
              against your own review log, so the scheduler shapes itself to <em>your</em> memory
              rather than a one-size-fits-all average.
            </>,
            <>
              <strong>Same interface, better intervals.</strong> You still rate recall as
              again / hard / good / easy. What changes is what happens next.
            </>,
          ]}
        />

        <SectionTitle>Why it fits opening prep</SectionTitle>
        <Para>
          Opening lines have very uneven difficulty: a forced 8-move tactic and a long quiet
          equalizing line look the same to SM-2 once they&apos;re both in &quot;mature&quot;
          status. FSRS&apos;s per-card stability handles that better — long lines settle into
          longer intervals when you actually remember them, and shorter ones don&apos;t get stretched
          past what you can recall under tournament pressure.
        </Para>

        <SectionTitle>What RepDrill uses</SectionTitle>
        <Para>
          RepDrill schedules every line as a card via the <code className="notation rounded-sm bg-[color:var(--surface-soft)] px-1.5 py-0.5 text-[0.9em] text-[color:var(--ink)]">ts-fsrs</code> implementation,
          with default parameters tuned for typical study patterns. As your review history grows,
          we&apos;ll add a way to retrain the parameters against your data for sharper intervals.
        </Para>

        <SectionTitle>If you want to read further</SectionTitle>
        <List
          items={[
            <>The FSRS algorithm spec and parameter explanations live in the open-source repo.</>,
            <>Three-component model of memory (difficulty / stability / retrievability) — search for &quot;DSR model&quot;.</>,
            <>Anki&apos;s built-in FSRS docs are a useful, concrete tour of the tradeoffs.</>,
          ]}
        />
      </PremiumPanel>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/documentation/spaced-repetition"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[5px] transition-colors duration-200 hover:text-[color:var(--library-green)] hover:decoration-[color:var(--library-green)]"
        >
          ← Why spaced repetition
        </Link>
        <Link
          href="/documentation"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[5px] transition-colors duration-200 hover:text-[color:var(--library-green)] hover:decoration-[color:var(--library-green)]"
        >
          All documentation →
        </Link>
      </div>
    </AppSurface>
  );
}
