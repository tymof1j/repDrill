import Link from 'next/link';
import { auth } from '@/auth';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingReveal } from '@/components/landing/LandingReveal';

const articles = [
  {
    chapter: 'I',
    title: 'The position is the source of truth.',
    body:
      'Annotations attach to the position graph, not a sequence of moves. When the same diagram appears via two openings, the work transfers — there is no duplicate.',
  },
  {
    chapter: 'II',
    title: 'Recall on the curve of forgetting.',
    body:
      'Again, Hard, Good, Easy. Each rating informs the FSRS scheduler, which spaces every line on the actual decay of memory rather than a fixed interval.',
  },
  {
    chapter: 'III',
    title: 'Find where prep ran out.',
    body:
      'Pull recent online games and let RepDrill mark the move on which you departed from the book. The result is a focused review queue, not a vague intuition.',
  },
];

const lineRows = [
  ['1.', 'd4 Nf6', '2.', 'c4 g6', 'Grünfeld', 'D85', 'due'],
  ['1.', 'e4 c5', '2.', 'Nf3 d6', 'Najdorf', 'B90', 'due'],
  ['1.', 'd4 d5', '2.', 'c4 e6', 'QGD', 'D37', 'mastered'],
  ['1.', 'e4 e5', '2.', 'Nf3 Nc6', 'Italian', 'C50', 'new'],
];

export default async function Home() {
  const session = await auth();
  const ctaHref = session?.user ? '/courses' : '/login';
  const ctaLabel = session?.user ? 'Open library' : 'Begin study';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--paper)] text-[color:var(--ink)]">
      <LandingNav ctaHref={ctaHref} ctaLabel={ctaLabel} />

      {/* ─── Hero / Frontispiece ─────────────────────────────────── */}
      <section className="relative mx-auto w-full max-w-7xl px-5 pb-24 pt-32 md:px-10 md:pt-40 lg:px-14">
        <LandingReveal>
          <div className="flex items-baseline justify-between gap-6 border-b border-[color:var(--paper-edge)] pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              Frontispiece — § 1
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              MMXXVI · Self-hosted
            </p>
          </div>
        </LandingReveal>

        <div className="mt-10 grid grid-cols-1 gap-12 md:mt-16 md:grid-cols-12">
          <LandingReveal className="md:col-span-7">
            <p className="font-display-italic text-base text-[color:var(--ink-soft)] md:text-lg">
              A manual of opening memory,
            </p>
            <h1 className="mt-3 font-display text-[20vw] font-medium leading-[0.86] tracking-[-0.04em] text-[color:var(--ink)] sm:text-[18vw] md:text-[14vw] lg:text-[12rem]">
              Rep<span className="font-display-italic text-[color:var(--margin-red)]">D</span>rill
            </h1>
            <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              <span aria-hidden className="h-px w-12 bg-[color:var(--paper-edge)]" />
              for the studious player
              <span aria-hidden className="h-px flex-1 bg-[color:var(--paper-edge)]" />
            </div>
          </LandingReveal>

          <LandingReveal className="md:col-span-5" delay={150}>
            <div className="md:pt-12">
              <p className="font-display-italic text-2xl leading-relaxed text-[color:var(--ink-soft)] md:text-[28px]">
                A position graph for your prep, an FSRS schedule for your recall, and a&nbsp;quiet
                place to find where the book ran out.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link
                  href={ctaHref}
                  className="group inline-flex items-center gap-3 border border-[color:var(--ink)] bg-[color:var(--ink)] px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--paper)] transition-colors duration-300 hover:bg-[color:var(--margin-red)] hover:border-[color:var(--margin-red)]"
                >
                  {ctaLabel}
                  <span aria-hidden className="h-px w-4 bg-current transition-all duration-300 group-hover:w-8" />
                </Link>
                <a
                  href="#method"
                  className="group inline-flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.20em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[6px] transition-colors duration-200 hover:text-[color:var(--margin-red)] hover:decoration-[color:var(--margin-red)]"
                >
                  Read the method
                  <span aria-hidden className="text-[color:var(--ink-faint)]">↓</span>
                </a>
              </div>
            </div>
          </LandingReveal>
        </div>

        {/* Diagram + caption — frontispiece illustration */}
        <LandingReveal delay={250}>
          <div className="mt-20 grid grid-cols-1 gap-10 border-t border-[color:var(--paper-edge)] pt-10 md:mt-28 md:grid-cols-12 md:gap-14">
            <div className="md:col-span-7">
              <FrontispieceBoard />
            </div>
            <div className="flex flex-col justify-between md:col-span-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Diagram I — White to play
                </p>
                <p className="mt-4 font-display-italic text-lg leading-relaxed text-[color:var(--ink-soft)]">
                  &ldquo;The line is only the surface. The position is the source of truth.&rdquo;
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-ghost)]">
                  Annotation, ECO D85
                </p>
              </div>
              <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-[color:var(--paper-rule)] pt-6">
                {[
                  ['Stability', '18.6'],
                  ['Difficulty', '6.1'],
                  ['Last seen', '3d'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                      {label}
                    </dt>
                    <dd
                      className="mt-1 font-display text-2xl tabular-nums text-[color:var(--ink)]"
                      style={{ fontFeatureSettings: '"onum"' }}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </LandingReveal>
      </section>

      {/* ─── Method (3 articles) ────────────────────────────────── */}
      <section id="method" className="relative border-t border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-24 md:px-10 md:py-32 lg:px-14">
          <LandingReveal>
            <div className="flex items-baseline justify-between gap-6 border-b border-[color:var(--paper-edge)] pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                Part II — The method
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                Three principles
              </p>
            </div>
            <h2 className="mt-12 max-w-3xl font-display text-5xl font-medium leading-[1.04] tracking-[-0.02em] text-[color:var(--ink)] md:text-7xl">
              Theory becomes
              <span className="font-display-italic"> memory </span>
              when you study positions, not move lists.
            </h2>
          </LandingReveal>

          <div className="mt-20 grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-3 md:gap-y-0">
            {articles.map((a, idx) => (
              <LandingReveal key={a.chapter} delay={idx * 110} className="md:border-l md:border-[color:var(--paper-rule)] md:pl-8 md:first:border-l-0 md:first:pl-0">
                <p
                  className="font-display text-7xl italic leading-none tracking-tight text-[color:var(--margin-red)]"
                  style={{ fontFeatureSettings: '"onum"' }}
                >
                  {a.chapter}.
                </p>
                <h3 className="mt-6 font-display text-[1.7rem] font-medium leading-[1.15] tracking-[-0.01em] text-[color:var(--ink)]">
                  {a.title}
                </h3>
                <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
                  {a.body}
                </p>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Specimen — sample training screen ──────────────────── */}
      <section id="specimen" className="border-t border-[color:var(--paper-edge)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-24 md:px-10 md:py-32 lg:px-14">
          <LandingReveal>
            <div className="flex items-baseline justify-between gap-6 border-b border-[color:var(--paper-edge)] pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                Part III — Specimen
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                A page of practice
              </p>
            </div>
          </LandingReveal>

          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12">
            <LandingReveal className="lg:col-span-5">
              <h2 className="font-display text-4xl font-medium leading-[1.06] tracking-[-0.01em] text-[color:var(--ink)] md:text-5xl">
                Each session reads like a&nbsp;page of
                <span className="font-display-italic"> annotated practice.</span>
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
                A diagram on the left, the prompt and the line on the right. Notation in
                the margin. Marginalia in italic. Nothing extra.
              </p>
              <div className="mt-10 grid max-w-sm grid-cols-3 gap-x-6 gap-y-1 border-t border-[color:var(--paper-rule)] pt-6">
                {[
                  ['Due', '43', 'red'],
                  ['New', '18', 'gold'],
                  ['In book', '91%', 'green'],
                ].map(([label, value, tone]) => (
                  <div key={label as string}>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                      {label}
                    </p>
                    <p
                      className="mt-1 font-display text-3xl tabular-nums"
                      style={{
                        fontFeatureSettings: '"onum"',
                        color:
                          tone === 'red'
                            ? 'var(--margin-red)'
                            : tone === 'gold'
                              ? 'var(--gilt)'
                              : 'var(--library-green)',
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </LandingReveal>

            <LandingReveal className="lg:col-span-7" delay={150}>
              <SpecimenTable />
            </LandingReveal>
          </div>
        </div>
      </section>

      {/* ─── Colophon ──────────────────────────────────────────── */}
      <section id="colophon" className="border-t border-[color:var(--paper-edge)] bg-[color:var(--paper-deep)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-24 md:px-10 md:py-32 lg:px-14">
          <LandingReveal>
            <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
              <div className="md:col-span-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                  Colophon
                </p>
                <h2 className="mt-6 font-display text-4xl font-medium leading-[1.04] tracking-[-0.01em] text-[color:var(--ink)] md:text-6xl">
                  Built to be
                  <span className="font-display-italic"> owned. </span>
                </h2>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
                  Open source, local-first in spirit. A SQLite file holds your library;
                  no cloud, no upsell. Self-host and the manual is yours.
                </p>
              </div>
              <div className="md:col-span-7 md:border-l md:border-[color:var(--paper-edge)] md:pl-12">
                <dl className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3">
                  {[
                    ['Framework', 'Next.js 16'],
                    ['Storage', 'SQLite + Drizzle'],
                    ['Scheduler', 'FSRS'],
                    ['Auth', 'Auth.js'],
                    ['Style', 'Tailwind v4'],
                    ['License', 'AGPL-3'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                        {k}
                      </dt>
                      <dd className="mt-2 font-display text-lg italic text-[color:var(--ink)]">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-[color:var(--paper-rule)] pt-8">
                  <Link
                    href={ctaHref}
                    className="group inline-flex items-center gap-3 border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.20em] text-[color:var(--paper)] transition-colors duration-300 hover:bg-[color:var(--margin-red)] hover:border-[color:var(--margin-red)]"
                  >
                    {ctaLabel}
                    <span aria-hidden className="h-px w-4 bg-current transition-all duration-200 group-hover:w-7" />
                  </Link>
                  <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-[color:var(--ink-faint)]">
                    Vol. I — Repertoire trainer
                  </p>
                </div>
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>
    </div>
  );
}

/* ─── Frontispiece chess board (decorative) ───────────────────── */

function FrontispieceBoard() {
  return (
    <div className="bracket-frame relative bg-[color:var(--paper-shade)] p-3 md:p-4">
      <span className="bracket-tl" />
      <span className="bracket-tr" />
      <span className="bracket-bl" />
      <span className="bracket-br" />
      <div className="grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden border border-[color:var(--ink)] shadow-[0_12px_28px_rgba(58,42,28,0.2)]">
        {Array.from({ length: 64 }, (_, i) => (
          <div
            key={i}
            className={(Math.floor(i / 8) + i) % 2 === 0 ? 'bg-[color:var(--square-light)]' : 'bg-[color:var(--square-dark)]'}
          />
        ))}
        {/* A few pieces, Grünfeld-ish snapshot */}
        <Piece pos="d2" glyph="♙" tone="light" />
        <Piece pos="e2" glyph="♙" tone="light" />
        <Piece pos="c4" glyph="♙" tone="light" />
        <Piece pos="c3" glyph="♘" tone="light" />
        <Piece pos="g7" glyph="♝" tone="dark" />
        <Piece pos="d5" glyph="♟" tone="dark" />
        <Piece pos="f6" glyph="♞" tone="dark" />
        <Piece pos="e1" glyph="♔" tone="light" />
        <Piece pos="e8" glyph="♚" tone="dark" />
      </div>
    </div>
  );
}

const fileToCol: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 };

function Piece({ pos, glyph, tone }: { pos: string; glyph: string; tone: 'light' | 'dark' }) {
  const col = fileToCol[pos[0]];
  const row = 9 - Number(pos[1]);
  return (
    <div
      className="flex items-center justify-center text-[6vw] sm:text-5xl md:text-[2.6rem] lg:text-5xl"
      style={{
        gridColumnStart: col,
        gridRowStart: row,
        color: tone === 'light' ? '#1a1410' : '#f5ecd5',
        textShadow: tone === 'dark' ? '0 1px 0 rgba(0,0,0,0.45)' : '0 1px 0 rgba(255,255,255,0.4)',
      }}
    >
      {glyph}
    </div>
  );
}

/* ─── Specimen line table ─────────────────────────────────────── */

function SpecimenTable() {
  return (
    <div className="bracket-frame relative bg-[color:var(--paper-shade)]">
      <span className="bracket-tl" />
      <span className="bracket-tr" />
      <span className="bracket-bl" />
      <span className="bracket-br" />
      <div className="border-b border-[color:var(--paper-edge)] px-5 py-4 md:px-7 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Today&apos;s queue · 4 of 43
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            ECO
          </p>
        </div>
      </div>
      <ul className="divide-y divide-[color:var(--paper-rule)]">
        {lineRows.map(([n1, w1, n2, w2, name, eco, status], i) => (
          <li
            key={i}
            className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 px-5 py-4 md:gap-6 md:px-7 md:py-5"
          >
            <div className="notation flex items-baseline gap-2 text-sm text-[color:var(--ink)]">
              <span className="text-[color:var(--ink-faint)]">{n1}</span>
              <span>{w1}</span>
              <span className="text-[color:var(--ink-faint)]">{n2}</span>
              <span>{w2}</span>
            </div>
            <div>
              <p className="font-display-italic text-base text-[color:var(--ink-soft)]">{name}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">
                {eco}
              </p>
            </div>
            <span
              className={`stamp ${
                status === 'due'
                  ? 'text-[color:var(--margin-red)]'
                  : status === 'new'
                    ? 'text-[color:var(--gilt)]'
                    : 'text-[color:var(--library-green)]'
              }`}
            >
              {status as string}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-[color:var(--paper-edge)] px-5 py-3 md:px-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          continued overleaf →
        </p>
      </div>
    </div>
  );
}
