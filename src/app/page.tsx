import Link from 'next/link';
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
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

const startSteps = [
  {
    label: '01',
    icon: 'book',
    title: 'Select a good resource',
    body: 'Book, course, coach file, or line.',
  },
  {
    label: '02',
    icon: 'pgn',
    title: 'Create or download PGN',
    body: 'Keep chapters and model lines clean.',
  },
  {
    label: '03',
    icon: 'login',
    title: 'Log in to RepDrill',
    body: 'Open your synced web workspace.',
  },
  {
    label: '04',
    icon: 'import',
    title: 'Import PGN',
    body: 'Check the tree and position notes.',
  },
  {
    label: '05',
    icon: 'cards',
    title: 'Train chess flashcards',
    body: 'Review today’s due positions.',
  },
];

const platformModules = [
  {
    label: 'Courses',
    title: 'Keep opening files maintainable',
    body:
      'Build named courses from PGN chapters or manual lines. Each chapter remains a navigable move tree with inline annotations, branch controls, and readable line paths.',
    details: ['PGN import', 'Chapter trees', 'Inline notes'],
  },
  {
    label: 'Repertoires',
    title: 'Merge courses into one book',
    body:
      'Combine several courses into a single repertoire view. When move orders overlap, RepDrill works from the board position, so transpositions do not split your memory.',
    details: ['Merged tree', 'Side filter', 'Preferred choices'],
  },
  {
    label: 'Training',
    title: 'Drill due positions instead of whole files',
    body:
      'The FSRS scheduler tracks stability and difficulty for review cards, then serves the positions that need recall today. Opponent moves play automatically.',
    details: ['FSRS queue', 'Board input', 'SAN input'],
  },
  {
    label: 'Analyze',
    title: 'Repair prep from real games',
    body:
      'Connect Lichess or Chess.com, pull recent games, and jump to the first move where the game left your repertoire. Save annotations per ply and convert gaps into study work.',
    details: ['Deviation finder', 'PGN navigation', 'Game notes'],
  },
  {
    label: 'Sharing',
    title: 'Send useful prep, not screenshots',
    body:
      'Share a full course, one chapter, a single line, a merged repertoire, or an analyzed game with read-only or copy access through a public link or email invite.',
    details: ['Share links', 'Copy access', 'Read-only analysis'],
  },
  {
    label: 'Ownership',
    title: 'Sync without trapping the library',
    body:
      'Convex keeps the workspace reactive while PGN and JSON exports keep your repertoire portable. Notes, review history, and shared resources stay organized around positions.',
    details: ['Real-time sync', 'PGN export', 'JSON archive'],
  },
];

const benefits = [
  ['Position-first memory', 'Notes survive move-order changes and transpositions.'],
  ['Smaller daily queue', 'Review time is spent on weak lines, not everything you own.'],
  ['Clear post-game repair', 'Every surprise in a real game becomes a concrete study task.'],
  ['Portable by design', 'Your prep is stored in Convex and can leave anytime as PGN or a full JSON archive.'],
];

const comparisonSections = [
  {
    label: 'Core study',
    rows: [
      ['Build private opening courses', 'Create and maintain your own private opening library, not only consume published material.', 'check', 'limited', 'check'],
      ['Import and maintain PGN chapters', 'Bring PGN files into named chapters and keep them editable over time.', 'check', 'limited', 'check'],
      ['Inline position notes', 'Attach reminders and plans directly to positions in the move tree.', 'Position notes', 'limited', 'check'],
      ['Manual move-tree study', 'Browse branches, variations, and move paths without entering drill mode.', 'check', 'check', 'check'],
      ['Keyboard-first workflow', 'Use shortcuts for navigation and review without relying on mouse-heavy flows.', 'check', 'limited', 'limited'],
    ],
  },
  {
    label: 'Memory and scheduling',
    rows: [
      ['Spaced repetition', 'Automatically schedules reviews so lines return when memory is likely to fade.', 'FSRS', 'MoveTrainer', 'dash'],
      ['Daily due queue', 'Shows the study work due today instead of asking you to choose manually.', 'Position cards', 'Course reviews', 'dash'],
      ['Adaptive difficulty', 'Updates future intervals from how well you answered each review.', 'Per-card', 'Proprietary', 'dash'],
      ['Review only weak positions', 'Keeps daily work focused on positions that need recall.', 'check', 'limited', 'dash'],
      ['Avoid replaying whole files', 'Lets you study weak points without replaying every variation in a course.', 'check', 'limited', 'Manual'],
    ],
  },
  {
    label: 'Repertoire structure',
    rows: [
      ['Transposition handling', 'Recognizes when different move orders reach the same board position.', 'Position-first', 'limited', 'Manual'],
      ['Merge multiple courses', 'Combines separate courses into one coherent repertoire tree.', 'Repertoire view', 'dash', 'Manual'],
      ['White and Black side filtering', 'Keeps both-color preparation readable when one repertoire contains mixed material.', 'check', 'Course-level', 'Manual'],
      ['Preferred branch choices', 'Marks your preferred move when overlapping lines offer more than one branch.', 'check', 'dash', 'dash'],
      ['Notes shared across transpositions', 'Reuses notes when the same position appears through another move order.', 'check', 'limited', 'dash'],
    ],
  },
  {
    label: 'Game repair',
    rows: [
      ['Pull recent Lichess games', 'Imports recent online games for post-game opening checks.', 'check', 'dash', 'separate'],
      ['Pull recent Chess.com games', 'Supports Chess.com game import alongside Lichess.', 'check', 'dash', 'dash'],
      ['Find first out-of-book move', 'Highlights the first move where your game left known preparation.', 'check', 'dash', 'dash'],
      ['Annotate analyzed games per ply', 'Lets you write notes on exact moments in an analyzed game.', 'check', 'dash', 'Study comments'],
      ['Turn deviation into study work', 'Converts a real-game surprise into a concrete position to repair.', 'check', 'Manual', 'Manual'],
    ],
  },
  {
    label: 'Sharing and ownership',
    rows: [
      ['Share course, chapter, or line', 'Sends the exact study scope instead of a screenshot or pasted PGN.', 'check', 'Course access', 'Study link'],
      ['Share analyzed game', 'Shares a reviewed game with deviation context and annotations.', 'check', 'dash', 'Game link'],
      ['Copy shared material into own library', 'Lets recipients keep useful shared prep in their own workspace.', 'Copy access', 'Buy/enroll', 'Manual clone'],
      ['PGN export', 'Exports opening material back to a standard chess format.', 'check', 'limited', 'check'],
      ['Full JSON archive', 'Downloads a broader structured archive for ownership and portability.', 'check', 'dash', 'dash'],
    ],
  },
];

const reviewRows = [
  ['D85', 'Grunfeld sideline', '9...Nc6', 'due today'],
  ['B90', 'Najdorf main line', '12.Bg5', 'hard in 2d'],
  ['C50', 'Italian move order', '7.d3', 'new'],
];

export default async function Home() {
  const isLoggedIn = await isAuthenticatedNextjs();
  const ctaHref = isLoggedIn ? '/courses' : '/login';
  const ctaLabel = isLoggedIn ? 'Open library' : 'Start studying';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--paper)] text-[color:var(--ink)]">
      <LandingNav ctaHref={ctaHref} ctaLabel={ctaLabel} isLoggedIn={isLoggedIn} />

      <section className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-5 pb-10 pt-24 md:px-10 md:pb-14 md:pt-28 lg:grid-cols-12 lg:gap-10 lg:px-14">
        <LandingReveal className="lg:col-span-6 xl:col-span-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-faint)] shadow-[0_12px_32px_rgba(47,58,50,0.06)]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--library-green)]" />
            For opening prep that actually gets reviewed
          </p>
          <h1 className="mt-7 max-w-4xl font-display text-[clamp(3.1rem,7vw,5.2rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-[color:var(--ink)] text-balance">
            Turn every game into opening memory.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--ink-soft)] md:text-xl md:leading-8">
            RepDrill is a Convex-backed chess trainer for players who keep repertoire files,
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

      <section id="how-to-start" className="border-y border-[color:var(--paper-rule)] bg-[color:var(--surface)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20 lg:px-14">
          <LandingReveal>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--library-green)]">
                  Chess flashcards
                </p>
                <h2 className="mt-5 font-display text-[clamp(2.25rem,4.2vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--ink)] text-balance">
                  How to start?
                </h2>
                <p className="mt-5 max-w-sm text-[15px] leading-7 text-[color:var(--ink-soft)]">
                  From resource to chess flashcards.
                </p>
              </div>
              <div className="lg:col-span-9">
                <div className="relative rounded-[1.35rem] border border-dashed border-[color:var(--paper-edge)] bg-[color:var(--paper)] px-4 py-6 shadow-[0_20px_54px_rgba(47,58,50,0.06)] md:px-6">
                  <svg
                    aria-hidden
                    className="pointer-events-none absolute inset-x-8 top-1/2 hidden h-10 -translate-y-1/2 text-[color:var(--library-green)]/45 md:block"
                    viewBox="0 0 900 80"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M12 42 C110 12, 145 70, 230 40 S365 20, 450 43 S585 70, 670 39 S800 18, 888 41"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="8 9"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="grid gap-5 md:grid-cols-5">
                  {startSteps.map((step, index) => (
                    <div
                      key={step.label}
                      className={`relative ${index % 2 === 0 ? 'md:translate-y-1' : 'md:-translate-y-2'}`}
                    >
                      <article className={`relative z-10 flex h-full min-h-[10.5rem] flex-col rounded-[1.05rem] border-2 border-[color:var(--ink)]/15 bg-[color:var(--surface-soft)] p-4 shadow-[5px_6px_0_rgba(47,111,94,0.12)] ${index % 2 === 0 ? 'md:-rotate-1' : 'md:rotate-1'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--library-green)]">
                            {step.label}
                          </p>
                          <StartIcon name={step.icon} />
                        </div>
                        <h3 className="mt-5 text-[15px] font-semibold leading-snug text-[color:var(--ink)]">
                          {step.title}
                        </h3>
                        <p className="mt-3 text-[12px] leading-5 text-[color:var(--ink-soft)]">
                          {step.body}
                        </p>
                      </article>
                      {index < startSteps.length - 1 && (
                        <span
                          aria-hidden
                          className="absolute -right-5 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 rotate-[-8deg] place-items-center rounded-full border-2 border-[color:var(--library-green)]/35 bg-[color:var(--paper)] font-mono text-[14px] text-[color:var(--library-green)] shadow-[2px_3px_0_rgba(47,111,94,0.12)] md:grid"
                        >
                          →
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                </div>
                <figure className="relative mt-7 max-w-3xl rotate-[-0.6deg] border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-6 shadow-[8px_10px_0_rgba(154,120,57,0.12)]">
                  <span
                    aria-hidden
                    className="absolute -top-3 left-8 h-6 w-24 rotate-[-2deg] border border-[color:var(--paper-rule)] bg-[color:var(--paper-shade)]/80"
                  />
                  <figcaption className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--library-green)]">
                    Review note
                  </figcaption>
                  <blockquote className="mt-4 font-display text-2xl font-semibold leading-snug tracking-[-0.03em] text-[color:var(--ink)]">
                    “Like Anki flashcards, but for chess.”
                  </blockquote>
                  <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[color:var(--ink-soft)]">
                    You answer with moves instead of text. RepDrill schedules the next review,
                    so opening knowledge comes back before it fades.
                  </p>
                </figure>
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      <section id="use-cases" className="border-y border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20 lg:px-14">
          <LandingReveal>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  Planned use
                </p>
                <h2 className="mt-5 max-w-full font-display text-[clamp(2.25rem,4.2vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--ink)] text-balance">
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

      <section id="platform" className="border-b border-[color:var(--paper-rule)] bg-[color:var(--paper)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20 lg:px-14">
          <LandingReveal>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  Web platform
                </p>
                <h2 className="mt-5 max-w-2xl font-display text-[clamp(2.25rem,4.2vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--ink)] text-balance">
                  Everything around the board stays connected.
                </h2>
              </div>
              <p className="max-w-2xl text-[15px] leading-7 text-[color:var(--ink-soft)] lg:col-span-6 lg:col-start-7 lg:pt-10">
                RepDrill is not a static course reader. It is a workspace for building theory,
                merging transpositions, scheduling recall, checking online games, and sharing the
                exact positions that matter.
              </p>
            </div>
          </LandingReveal>
          <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.9fr_1.1fr]">
            {platformModules.map((module, index) => (
              <LandingReveal key={module.label} delay={index * 70}>
                <article className="group flex h-full flex-col rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--library-green)]/35 hover:shadow-[0_18px_46px_rgba(47,58,50,0.08)] md:p-6">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--library-green)]">
                    {module.label}
                  </p>
                  <h3 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-[-0.03em] text-[color:var(--ink)]">
                    {module.title}
                  </h3>
                  <p className="mt-4 flex-1 text-[15px] leading-7 text-[color:var(--ink-soft)]">
                    {module.body}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {module.details.map((detail) => (
                      <span
                        key={detail}
                        className="rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ink-faint)]"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </article>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20 lg:px-14">
          <LandingReveal>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Workflow
            </p>
            <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,4.2vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--ink)] text-balance">
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
              <h2 className="mt-5 font-display text-[clamp(2.25rem,4.2vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--ink)] text-balance">
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
            <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,4.2vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-balance">
              Own the repertoire, even when it syncs.
            </h2>
          </LandingReveal>
          <LandingReveal className="lg:col-span-5" delay={120}>
            <p className="max-w-md text-[15px] leading-7 text-[#d8ded2]">
              RepDrill stores your library in Convex for sync and deployment, while keeping
              exits wide open: export single courses as PGN or download the full archive as JSON.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['Next.js 16', 'Convex', 'PGN export', 'JSON archive', 'FSRS'].map((item) => (
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
            <Link
              href="#comparison"
              className="ml-3 mt-10 inline-flex min-h-12 items-center rounded-md border border-white/15 px-5 text-sm font-semibold text-[color:var(--paper)] transition-colors duration-200 hover:bg-white/10"
            >
              Feature comparison
            </Link>
          </LandingReveal>
        </div>
      </section>

      <section id="comparison" className="bg-[color:var(--paper)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20 lg:px-14">
          <LandingReveal>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--library-green)]">
                  Platform choice
                </p>
                <h2 className="mt-3 font-display text-[clamp(2.4rem,4.8vw,4.25rem)] font-semibold tracking-[-0.04em] text-[color:var(--ink)]">
                  Feature comparison
                </h2>
              </div>
              <p className="max-w-md text-[13px] leading-6 text-[color:var(--ink-faint)]">
                RepDrill is compared with Chessable courses and Lichess Study across the
                opening-prep work people repeat every week.
              </p>
            </div>
          </LandingReveal>
          <LandingReveal delay={120}>
            <ComparisonTable />
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

function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-[color:var(--paper-rule)]">
            <th className="px-1 py-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink)]">
              Comparison features
            </th>
            {['RepDrill', 'Chessable courses', 'Lichess Study'].map((name) => (
              <th key={name} className="px-5 py-4 text-center text-[13px] font-semibold text-[color:var(--ink)]">
                <span className="inline-flex items-center justify-center gap-2">
                  <PlatformLogo name={name} />
                  <span>{name}</span>
                  {name === 'RepDrill' && (
                    <span className="rounded-sm border border-[color:var(--gilt)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[color:var(--gilt)]">
                      Focused
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparisonSections.map((section, index) => (
            <TableSection key={section.label} label={section.label} rows={section.rows} isFirst={index === 0} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlatformLogo({ name }: { name: string }) {
  if (name === 'Chessable courses') {
    return (
      <span
        aria-hidden
        className="grid h-5 w-5 place-items-center rounded-sm bg-[#1f7ad7] text-[11px] font-bold text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.18)]"
      >
        C
      </span>
    );
  }

  if (name === 'Lichess Study') {
    return (
      <span
        aria-hidden
        className="grid h-5 w-5 place-items-center rounded-full border border-[#a8a8a8] bg-[#f5f5f5] text-[13px] font-semibold leading-none text-[#5f5f5f]"
      >
        ♞
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="grid h-5 w-5 place-items-center rounded-sm bg-[color:var(--ink)] text-[11px] font-bold text-[color:var(--paper)]"
    >
      R
    </span>
  );
}

function StartIcon({ name }: { name: string }) {
  const iconClass =
    'h-8 w-8 text-[color:var(--library-green)] drop-shadow-[2px_2px_0_rgba(47,111,94,0.1)]';

  if (name === 'book') {
    return (
      <svg aria-hidden className={iconClass} viewBox="0 0 40 40" fill="none">
        <path d="M7 11c5-3 9-2 13 1v19c-4-3-8-4-13-1V11Z" fill="currentColor" opacity="0.14" />
        <path d="M20 12c4-3 8-4 13-1v19c-5-3-9-2-13 1V12Z" fill="currentColor" opacity="0.22" />
        <path d="M7 11c5-3 9-2 13 1m0 0c4-3 8-4 13-1M20 12v19M7 11v19c5-3 9-2 13 1m13-20v19c-5-3-9-2-13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'pgn') {
    return (
      <svg aria-hidden className={iconClass} viewBox="0 0 40 40" fill="none">
        <path d="M12 6h12l6 6v22H12V6Z" fill="currentColor" opacity="0.14" />
        <path d="M24 6v7h6M12 6h12l6 6v22H12V6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 23h10M15 28h7M15 18h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'login') {
    return (
      <svg aria-hidden className={iconClass} viewBox="0 0 40 40" fill="none">
        <path d="M22 8h10v24H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 20h17m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'import') {
    return (
      <svg aria-hidden className={iconClass} viewBox="0 0 40 40" fill="none">
        <path d="M20 7v16m0 0-6-6m6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 25v7h20v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 32h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      </svg>
    );
  }

  return (
    <svg aria-hidden className={iconClass} viewBox="0 0 40 40" fill="none">
      <path d="M11 13h18v18H11V13Z" fill="currentColor" opacity="0.12" />
      <path d="M8 9h18v18H8V9Z" fill="currentColor" opacity="0.18" />
      <path d="M8 9h18v18H8V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 16h6M14 21h8M11 13l-3-4M26 27l3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TableSection({ label, rows, isFirst }: { label: string; rows: string[][]; isFirst: boolean }) {
  return (
    <>
      {!isFirst && (
        <tr aria-hidden>
          <td colSpan={4} className="h-3 border-0 p-0" />
        </tr>
      )}
      <tr>
        <td
          colSpan={4}
          className="bg-[color:var(--paper-shade)] px-1 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[color:var(--ink-soft)]"
        >
          {label}
        </td>
      </tr>
      {rows.map(([feature, description, repdrill, chessable, lichess]) => (
        <tr key={`${label}-${feature}`} className="border-b border-[color:var(--paper-rule)]/60">
          <th className="px-1 py-2.5 text-[12px] font-medium leading-5 text-[color:var(--ink)]">
            <span className="inline-flex items-center gap-1.5">
              {feature}
              <Tooltip text={description} />
            </span>
          </th>
          {[repdrill, chessable, lichess].map((value, index) => (
            <td
              key={`${feature}-${index}`}
              className="px-5 py-2.5 text-center align-middle text-[12px] leading-5"
            >
              <ComparisonCell value={value} column={index} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="grid h-4 w-4 place-items-center rounded-full bg-[color:var(--paper-shade)] font-mono text-[10px] font-semibold text-[color:var(--ink-faint)] transition-colors duration-150 hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)] focus-visible:bg-[color:var(--ink)] focus-visible:text-[color:var(--paper)] focus-visible:outline-none"
      >
        ?
      </button>
      <span className="pointer-events-none absolute bottom-[calc(100%+0.65rem)] left-1/2 z-20 hidden w-72 -translate-x-1/2 rounded-md bg-[color:var(--ink)] px-4 py-3 text-left text-[12px] font-normal leading-5 text-[color:var(--paper)] shadow-[0_18px_44px_rgba(23,26,23,0.18)] group-hover:block group-focus-within:block">
        {text}
        <span className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[color:var(--ink)]" />
      </span>
    </span>
  );
}

function ComparisonCell({ value, column }: { value: string; column: number }) {
  if (value === 'check') {
    return (
      <span
        aria-label="Included"
        className="mx-auto inline-grid h-4 w-4 place-items-center rounded-full bg-[color:var(--library-green)] text-[11px] leading-none text-white"
      >
        ✓
      </span>
    );
  }

  if (value === 'dash') {
    return <span className="font-mono text-[color:var(--ink-ghost)]">–</span>;
  }

  if (value === 'limited') {
    return <span className="font-mono text-[color:var(--ink-ghost)]">–</span>;
  }

  return (
    <span
      className={`block text-center ${
        column === 0 ? 'font-semibold text-[color:var(--library-green)]' : 'text-[color:var(--ink-soft)]'
      }`}
    >
      {value}
    </span>
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
