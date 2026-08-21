import Link from 'next/link';
import { isAuthenticated } from '@/lib/workos/server';
import { redirect } from 'next/navigation';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingReveal } from '@/components/landing/LandingReveal';
import { LandingDemoBoard } from '@/components/landing/LandingDemoBoard';

const needs = [
  {
    number: '01',
    title: 'Turn good material into practice',
    body: 'Keep the positions worth remembering from books, courses, and coach files — then solve them instead of letting them disappear into a folder.',
  },
  {
    number: '02',
    title: 'Remember your openings in real games',
    body: 'Train the exact decisions you need to make. RepDrill brings weak positions back before your memory drops them.',
  },
  {
    number: '03',
    title: 'Learn from every surprise',
    body: 'After a game, find where you left familiar territory and turn that moment into tomorrow’s training.',
  },
];

const workflowSteps = [
  {
    number: '01',
    cue: 'PGN import',
    title: 'Import theory',
    body: 'Bring in PGN chapters or add your own lines.',
  },
  {
    number: '02',
    cue: 'Position note',
    title: 'Attach notes to positions',
    body: 'Plans and reminders stay with the board, even after transpositions.',
  },
  {
    number: '03',
    cue: "Today's queue",
    title: 'Review what is due',
    body: 'FSRS turns every answer into a next review date.',
  },
  {
    number: '04',
    cue: 'Game check',
    title: 'Repair from real games',
    body: 'Find the first move where your game left the repertoire.',
  },
];

export default async function Home() {
  const isLoggedIn = await isAuthenticated();
  if (isLoggedIn) redirect('/courses');

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--paper)] text-[color:var(--ink)]">
      <LandingNav ctaHref="/sign-in" ctaLabel="Start training" isLoggedIn={false} />

      <section className="mx-auto grid min-h-[92vh] w-full max-w-7xl items-center gap-14 px-5 pb-16 pt-28 md:px-10 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,.97fr)] lg:px-14">
        <LandingReveal className="relative z-10 min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--library-green)]">
            Chess study that comes back when you need it
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.9rem,5.4vw,5rem)] font-semibold leading-[1.08] tracking-[-0.05em] text-balance [hyphens:auto] [overflow-wrap:anywhere]">
            Stop collecting.
            {/* Block + top margin gives the accent line its own vertical room:
                its taller glyphs (and the Ukrainian apostrophe) must never
                collide with the line above. */}
            <span className="mt-[0.22em] block font-display-italic font-normal text-[color:var(--margin-red)]">
              Start remembering.
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--ink-soft)] md:text-xl">
            RepDrill turns the positions you care about into focused practice —
            so your books, openings, and game lessons show up over the board.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/sign-in"
              className="group inline-flex min-h-12 items-center gap-4 rounded-md bg-[color:var(--ink)] px-6 py-3 text-sm font-semibold text-[color:var(--paper)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--library-green)]"
            >
              Build my training library
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <a
              href="#how-it-helps"
              className="text-sm font-semibold text-[color:var(--ink-soft)] underline decoration-[color:var(--paper-edge)] underline-offset-8 hover:text-[color:var(--ink)]"
            >
              See how it fits your study
            </a>
          </div>
          <p className="mt-6 text-xs text-[color:var(--ink-faint)]">
            Begin with one course. No new study system to learn.
          </p>
        </LandingReveal>

        <LandingReveal delay={140} className="min-w-0">
          <div className="relative ml-auto max-w-[620px] rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-3 shadow-[0_28px_90px_rgba(47,58,50,0.14)] md:p-5">            <div className="mb-4 flex items-start justify-between gap-5 px-1">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                  Today’s position
                </p>
                <p className="mt-1 font-display text-xl font-semibold">Find White’s strongest move</p>
              </div>
              <span className="rounded-full bg-[color:var(--paper-shade)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[color:var(--margin-red)]">
                from your book
              </span>
            </div>
            <LandingDemoBoard />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--paper-rule)] px-1 pt-4 text-sm">
              <div>
                <p className="text-[color:var(--ink-faint)]">Source</p>
                <p className="mt-1 font-medium">Vienna Chess Society</p>
              </div>
              <div>
                <p className="text-[color:var(--ink-faint)]">Context</p>
                <p className="mt-1 font-medium">Steinitz — Gelbfuhs, 1873</p>
              </div>
            </div>
          </div>
        </LandingReveal>
      </section>

      <section id="how-it-helps" className="border-y border-[color:var(--paper-rule)] bg-[color:var(--surface)]">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 lg:px-14 lg:py-32">
          <LandingReveal className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">
                Made for the way players actually study
              </p>
              <h2 className="mt-5 max-w-md font-display text-5xl font-semibold leading-[.98] tracking-[-0.05em] md:text-6xl">
                Your chess material should become moves you can find.
              </h2>
            </div>
            <ol className="border-t border-[color:var(--paper-rule)]">
              {needs.map((need) => (
                <li
                  key={need.number}
                  className="grid gap-4 border-b border-[color:var(--paper-rule)] py-7 sm:grid-cols-[3rem_1fr_1.25fr] sm:items-baseline"
                >
                  <span className="font-display-italic text-xl text-[color:var(--margin-red)]">
                    {need.number}
                  </span>
                  <h3 className="font-display text-2xl font-semibold tracking-[-0.025em]">
                    {need.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[color:var(--ink-soft)]">
                    {need.body}
                  </p>
                </li>
              ))}
            </ol>
          </LandingReveal>
        </div>
      </section>

      <section id="book-training" className="mx-auto max-w-7xl px-5 py-24 md:px-10 lg:px-14 lg:py-36">
        <LandingReveal className="grid overflow-hidden rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--ink)] text-[color:var(--paper)] lg:grid-cols-[1.1fr_.9fr]">
          <div className="p-8 md:p-12 lg:p-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--gilt)]">
              New · Book puzzle courses
            </p>
            <h2 className="mt-6 max-w-xl font-display text-5xl font-semibold leading-[.95] tracking-[-0.05em] md:text-6xl">
              A great chess book is only useful if you do the work.
            </h2>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-[color:var(--paper-edge)]">
              RepDrill keeps each diagram together with the players, event, year,
              and author’s explanation. You see the position first. The answer
              stays hidden until you commit to a move.
            </p>
            <Link
              href="/sign-in"
              className="mt-9 inline-flex items-center gap-3 rounded-md bg-[color:var(--paper)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)] hover:bg-white"
            >
              Build a puzzle course from your book <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid min-h-[420px] place-items-center bg-[color:var(--library-green)] p-8">
            <div className="w-full max-w-sm -rotate-2 rounded-lg bg-[color:var(--paper)] p-7 text-[color:var(--ink)] shadow-[0_30px_80px_rgba(0,0,0,.24)]">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--margin-red)]">
                Puzzle course
              </p>
              <h3 className="mt-4 font-display text-4xl font-semibold leading-none tracking-[-0.04em]">
                Your favourite
                <br />
                tactics book
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                Add your own positions · solve them online · review them when due
              </p>
              <div className="mt-8 flex items-end justify-between border-t border-[color:var(--paper-edge)] pt-5">
                <span className="font-display text-6xl font-semibold text-[color:var(--margin-red)]">∞</span>
                <span className="pb-2 text-right font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                  your
                  <br />
                  material
                </span>
              </div>
            </div>
          </div>
        </LandingReveal>
      </section>

      <section id="routine" className="border-y border-[color:var(--paper-rule)] bg-[color:var(--paper-shade)]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 lg:px-14 lg:py-24">
          <LandingReveal className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">
                Workflow
              </p>
              <h2 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[.98] tracking-[-0.05em] md:text-5xl">
                Study starts from the game you just played.
              </h2>
            </div>
            <p className="max-w-2xl text-[15px] leading-7 text-[color:var(--ink-soft)] lg:justify-self-end">
              The intended routine is simple: keep your opening files in RepDrill,
              train the lines that are due, then use online games to discover exactly
              which positions need attention.
            </p>
          </LandingReveal>

          <LandingReveal delay={100}>
            <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--paper-rule)] shadow-[0_18px_54px_rgba(47,58,50,0.07)] sm:grid-cols-2 lg:grid-cols-4">
              {workflowSteps.map((step, index) => (
                <li
                  key={step.number}
                  className="group relative flex min-h-56 flex-col bg-[color:var(--surface)] p-6 transition-colors duration-200 hover:bg-[color:var(--surface-soft)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--library-green)]">
                      Step {step.number}
                    </span>
                    <span className="font-display-italic text-xl text-[color:var(--margin-red)]">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-7 max-w-[15rem] font-display text-2xl font-semibold leading-tight tracking-[-0.035em]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                    {step.body}
                  </p>
                  <div className="mt-auto flex items-center gap-2 border-t border-[color:var(--paper-rule)] pt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--library-green)]" />
                    {step.cue}
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute -right-3 top-7 z-10 hidden h-6 w-6 place-items-center rounded-full border border-[color:var(--paper-rule)] bg-[color:var(--paper-shade)] text-xs text-[color:var(--library-green)] lg:grid"
                    >
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </LandingReveal>
        </div>
      </section>

      <footer className="border-t border-[color:var(--paper-rule)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-20 md:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-14">
          <div>
            <p className="font-display text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
              Make your next
              <br />
              study session count.
            </p>
            <p className="mt-5 text-[color:var(--ink-soft)]">
              Start with the chess material you already trust.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex min-h-12 w-max items-center gap-4 rounded-md bg-[color:var(--margin-red)] px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Start training <span aria-hidden>→</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
