import Link from 'next/link';
import { auth } from '@/auth';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingReveal } from '@/components/landing/LandingReveal';

const heroPhoto =
  'https://images.pexels.com/photos/6028635/pexels-photo-6028635.jpeg?auto=compress&cs=tinysrgb&w=1600';

const useCases = [
  {
    label: 'Build',
    title: 'Turn PGNs into study courses',
    body:
      'Import opening files, split them into chapters, and keep the move order readable enough to maintain over time.',
  },
  {
    label: 'Connect',
    title: 'Merge transpositions automatically',
    body:
      'If two openings reach the same position, your note and review history belong to that position instead of one fragile line.',
  },
  {
    label: 'Review',
    title: 'Train only what is due',
    body:
      'FSRS scheduling turns every answer into a next review date, so daily work stays compact and measurable.',
  },
  {
    label: 'Repair',
    title: 'Analyze where games left the book',
    body:
      'Bring in recent online games and RepDrill marks the first move where your preparation stopped matching your repertoire.',
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Import theory',
    body: 'Bring in PGN chapters or add your own lines.',
  },
  {
    number: '02',
    title: 'Attach notes to positions',
    body: 'Plans and reminders stay with the board, even after transpositions.',
  },
  {
    number: '03',
    title: 'Review what is due',
    body: 'FSRS turns every answer into a next review date.',
  },
  {
    number: '04',
    title: 'Repair from real games',
    body: 'Find the first move where your game left the repertoire.',
  },
];

const benefits = [
  ['Position-first memory', 'Notes survive move-order changes and transpositions.'],
  ['Smaller daily queue', 'Review time is spent on weak lines, not everything you own.'],
  ['Clear post-game repair', 'Every surprise in a real game becomes a concrete study task.'],
  ['Self-hosted library', 'Your repertoire lives with you: SQLite, exportable, open source.'],
];

const reviewRows = [
  ['D85', 'Grunfeld sideline', '9...Nc6', 'due today'],
  ['B90', 'Najdorf main line', '12.Bg5', 'hard in 2d'],
  ['C50', 'Italian move order', '7.d3', 'new'],
];

export default async function Home() {
  const session = await auth();
  const ctaHref = session?.user ? '/courses' : '/login';
  const ctaLabel = session?.user ? 'Open library' : 'Start studying';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--paper)] text-[color:var(--ink)]">
      <LandingNav ctaHref={ctaHref} ctaLabel={ctaLabel} />

      <section className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-5 pb-10 pt-24 md:px-10 md:pb-14 md:pt-28 lg:grid-cols-12 lg:gap-10 lg:px-14">
        <LandingReveal className="lg:col-span-6 xl:col-span-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-faint)] shadow-[0_12px_32px_rgba(47,58,50,0.06)]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--library-green)]" />
            For opening prep that actually gets reviewed
          </p>
          <h1 className="mt-7 max-w-4xl font-display text-[3.65rem] font-semibold leading-[0.92] tracking-[-0.06em] text-[color:var(--ink)] sm:text-[4.8rem] lg:text-[5.25rem] xl:text-[5.7rem]">
            Turn every game into opening memory.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--ink-soft)] md:text-xl md:leading-8">
            RepDrill is a self-hosted chess trainer for players who keep repertoire files,
            forget move orders, and need a daily plan for what to repair next.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={ctaHref}
              className="group inline-flex min-h-12 items-center gap-3 rounded-md border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 text-sm font-semibold text-[color:var(--paper)] shadow-[0_18px_40px_rgba(23,26,23,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--library-green)]"
            >
              {ctaLabel}
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <a
              href="#workflow"
              className="inline-flex min-h-12 items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-5 text-sm font-semibold text-[color:var(--ink-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--surface)] hover:text-[color:var(--ink)]"
            >
              See the workflow
            </a>
          </div>
          <div className="mt-6 grid max-w-xl grid-cols-1 gap-3 text-[15px] leading-7 text-[color:var(--ink-soft)] sm:grid-cols-3">
            {['Import your theory', 'Review due positions', 'Patch lines from real games'].map((item) => (
              <div key={item} className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </LandingReveal>

        <LandingReveal className="lg:col-span-6 lg:col-start-7 xl:col-span-7 xl:col-start-6" delay={120}>
          <HeroVisual />
        </LandingReveal>
      </section>

      <section id="use-cases" className="border-y border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20 lg:px-14">
          <LandingReveal>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  Planned use
                </p>
                <h2 className="mt-5 max-w-lg font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--ink)] md:text-6xl">
                  One loop for building, remembering, and repairing prep.
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
                {useCases.map((card, index) => (
                  <LandingReveal key={card.label} delay={index * 80}>
                    <article className="rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-5 shadow-[0_14px_34px_rgba(47,58,50,0.06)] transition-transform duration-200 hover:-translate-y-0.5 md:p-6">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--library-green)]">
                        {card.label}
                      </p>
                      <h3 className="mt-5 max-w-sm font-display text-2xl font-semibold leading-tight tracking-[-0.03em] text-[color:var(--ink)]">
                        {card.title}
                      </h3>
                      <p className="mt-5 text-[15px] leading-7 text-[color:var(--ink-soft)]">
                        {card.body}
                      </p>
                    </article>
                  </LandingReveal>
                ))}
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      <section id="workflow">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20 lg:px-14">
          <LandingReveal>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Workflow
            </p>
            <h2 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--ink)] md:text-6xl">
              Study starts from the game you just played.
            </h2>
            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-[color:var(--ink-soft)]">
              The intended routine is simple: keep your opening files in RepDrill,
              train the lines that are due, then use online games to discover exactly
              which positions need attention.
            </p>
          </LandingReveal>
          <WorkflowSteps />
        </div>
      </section>

      <section id="benefits" className="border-y border-[color:var(--paper-rule)] bg-[color:var(--surface)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20 lg:px-14">
          <LandingReveal>
            <div className="max-w-3xl">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Why it matters
              </p>
              <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--ink)] md:text-6xl">
                The advantage is not more lines. It is knowing which line matters today.
              </h2>
            </div>
          </LandingReveal>
          <div className="mt-12 grid gap-3 md:grid-cols-2">
            {benefits.map(([title, body], index) => (
              <LandingReveal key={title} delay={index * 80}>
                <article className="grid gap-4 rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-5 md:grid-cols-[3rem_1fr] md:p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-[color:var(--ink)] font-mono text-[11px] font-semibold text-[color:var(--paper)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                      {title}
                    </h3>
                    <p className="mt-3 max-w-xl text-[15px] leading-7 text-[color:var(--ink-soft)]">
                      {body}
                    </p>
                  </div>
                </article>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="ownership" className="bg-[color:var(--ink)] text-[color:var(--paper)]">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-5 py-16 md:px-10 md:py-20 lg:grid-cols-12 lg:px-14">
          <LandingReveal className="lg:col-span-7">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--library-green-soft)]">
              Ownership
            </p>
            <h2 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl">
              Keep the repertoire on your machine.
            </h2>
          </LandingReveal>
          <LandingReveal className="lg:col-span-5" delay={120}>
            <p className="max-w-md text-[15px] leading-7 text-[#d8ded2]">
              RepDrill is open source and stores the library in SQLite. It is built for players
              who want a private training system, not another cloud account holding their prep.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['Next.js 16', 'SQLite + Drizzle', 'FSRS', 'AGPL-3'].map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-white/15 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8ded2]"
                >
                  {item}
                </span>
              ))}
            </div>
            <Link
              href={ctaHref}
              className="mt-10 inline-flex min-h-12 items-center rounded-md bg-[color:var(--paper)] px-5 text-sm font-semibold text-[color:var(--ink)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              {ctaLabel}
            </Link>
          </LandingReveal>
        </div>
      </section>
    </div>
  );
}

function HeroVisual() {
  return (
    <figure className="relative rounded-[1.35rem] border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-3 shadow-[0_30px_90px_rgba(47,58,50,0.16)]">
      <div className="relative min-h-[27rem] overflow-hidden rounded-[1rem] bg-[color:var(--ink)]">
        <div
          role="img"
          aria-label="A player studying chess beside a laptop and wooden chess board"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroPhoto})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,26,23,0.04),rgba(23,26,23,0.22))]" />
        <figcaption className="absolute bottom-4 left-4 max-w-xs rounded-lg border border-white/15 bg-black/28 px-4 py-3 text-xs leading-5 text-white/80 backdrop-blur-md">
          Photo by Kaboompics.com on Pexels. The point is the real context:
          chess study beside a digital workspace.
        </figcaption>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[
          ['Import', 'PGNs and chapters'],
          ['Review', '43 positions due'],
          ['Repair', 'Move 12 left book'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--library-green)]">
              {label}
            </p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">{value}</p>
          </div>
        ))}
      </div>
    </figure>
  );
}

function WorkflowSteps() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      {workflowSteps.map((step, index) => (
        <LandingReveal key={step.number} delay={index * 80}>
          <article className="grid gap-5 rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-5 shadow-[0_16px_44px_rgba(47,58,50,0.07)] md:p-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col justify-between">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--library-green)]">
                  Step {step.number}
                </p>
                <h3 className="mt-4 max-w-sm font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-[color:var(--ink)]">
                  {step.title}
                </h3>
              </div>
              <p className="mt-8 max-w-sm text-[15px] leading-7 text-[color:var(--ink-soft)]">
                {step.body}
              </p>
            </div>
            <StepPreview index={index} />
          </article>
        </LandingReveal>
      ))}
    </div>
  );
}

function StepPreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          PGN import
        </p>
        <div className="mt-5 space-y-3">
          {['Queen pawn repertoire', '18 chapters', '1,247 positions'].map((item) => (
            <div key={item} className="rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3 py-3 text-sm font-semibold">
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          Position note
        </p>
        <p className="mt-5 rounded-md border-l-2 border-[color:var(--library-green)] bg-[color:var(--surface)] px-4 py-4 text-sm leading-6 text-[color:var(--ink-soft)]">
          After ...g6, remember the pressure on d5. Same note appears in both Grunfeld move orders.
        </p>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          Today&apos;s queue
        </p>
        <ul className="mt-4 divide-y divide-[color:var(--paper-rule)] rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)]">
          {reviewRows.map(([eco, name, move]) => (
            <li key={eco} className="grid grid-cols-[3rem_1fr] gap-3 px-3 py-3">
              <span className="font-mono text-[11px] text-[color:var(--ink-faint)]">{eco}</span>
              <span>
                <span className="block text-sm font-semibold">{name}</span>
                <span className="notation block text-xs text-[color:var(--ink-faint)]">{move}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
        Game check
      </p>
      <div className="mt-5 rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-4">
        <p className="font-display text-2xl font-semibold tracking-[-0.04em]">Move 12</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
          First deviation found. Add this position to review.
        </p>
      </div>
    </div>
  );
}
