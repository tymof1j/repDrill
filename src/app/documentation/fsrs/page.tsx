import type { Metadata } from 'next';
import { DocLayout } from '../DocLayout';

export const metadata: Metadata = {
  title: 'Why FSRS — FAQ · RepDrill',
  description:
    'What the Free Spaced Repetition Scheduler does differently from SM-2 (Anki), and why RepDrill uses it for line scheduling.',
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
  { id: 'job', label: 'The job of a scheduler' },
  { id: 'sm2', label: 'What SM-2 does' },
  { id: 'fsrs', label: 'What FSRS does differently' },
  { id: 'openings', label: 'Why it fits opening prep' },
  { id: 'repdrill', label: 'What RepDrill uses' },
  { id: 'further', label: 'Further reading' },
];

export default function FsrsPage() {
  return (
    <DocLayout sections={sections}>
      <header className="mb-8 border-b border-[color:var(--paper-rule)] pb-6">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">
          Scheduler
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)] md:text-4xl">
          Why FSRS
        </h1>
        <Para>
          FSRS — the Free Spaced Repetition Scheduler — is the algorithm that decides when to
          show each line again. RepDrill uses it instead of older schedulers like SM-2.
        </Para>
      </header>

      <h2 id="job" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        The job of a scheduler
      </h2>
      <Para>
        A spaced-repetition scheduler answers one question per card: <em>given everything I know
        about how you&apos;ve recalled this card so far, when should I ask you again?</em> Pick
        intervals too short and you waste your time on already-known cards. Pick them too long
        and you forget before the next review.
      </Para>

      <h2 id="sm2" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        What SM-2 does
      </h2>
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

      <h2 id="fsrs" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        What FSRS does differently
      </h2>
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

      <h2 id="openings" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        Why it fits opening prep
      </h2>
      <Para>
        Opening lines have very uneven difficulty: a forced 8-move tactic and a long quiet
        equalizing line look the same to SM-2 once they&apos;re both in &quot;mature&quot;
        status. FSRS&apos;s per-card stability handles that better — long lines settle into
        longer intervals when you actually remember them, and shorter ones don&apos;t get stretched
        past what you can recall under tournament pressure.
      </Para>

      <h2 id="repdrill" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        What RepDrill uses
      </h2>
      <Para>
        RepDrill schedules every line as a card via the <code className="notation rounded-sm bg-[color:var(--surface-soft)] px-1.5 py-0.5 text-[0.9em] text-[color:var(--ink)]">ts-fsrs</code> implementation,
        with default parameters tuned for typical study patterns. As your review history grows,
        we&apos;ll add a way to retrain the parameters against your data for sharper intervals.
      </Para>

      <h2 id="further" className="mt-10 mb-4 scroll-mt-20 font-display text-xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-2xl">
        If you want to read further
      </h2>
      <List
        items={[
          <>The FSRS algorithm spec and parameter explanations live in the open-source repo.</>,
          <>Three-component model of memory (difficulty / stability / retrievability) — search for &quot;DSR model&quot;.</>,
          <>Anki&apos;s built-in FSRS docs are a useful, concrete tour of the tradeoffs.</>,
        ]}
      />
    </DocLayout>
  );
}
