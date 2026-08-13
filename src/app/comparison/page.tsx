import type { Metadata } from 'next';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/workos/server';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingReveal } from '@/components/landing/LandingReveal';

export const metadata: Metadata = {
  title: 'RepDrill comparison',
  description:
    'Compare RepDrill with Chessable courses and Lichess Study for opening preparation, spaced repetition, game repair, sharing, and data portability.',
};

const competitors = ['RepDrill', 'Chessable courses', 'Lichess Study'];

const sections = [
  {
    label: 'Core study',
    rows: [
      ['Build private opening courses', 'Yes', 'Mostly consume published courses', 'Yes'],
      ['Import and maintain PGN chapters', 'Yes', 'Limited by course format', 'Yes'],
      ['Inline position notes', 'Yes, attached to positions', 'Course-dependent', 'Yes'],
      ['Manual move-tree study', 'Yes', 'Yes', 'Yes'],
      ['Keyboard-first workflow', 'Yes', 'Limited', 'Limited'],
    ],
  },
  {
    label: 'Memory and scheduling',
    rows: [
      ['Spaced repetition', 'FSRS scheduler', 'MoveTrainer style reviews', 'No built-in SRS'],
      ['Daily due queue', 'Yes, position cards', 'Yes, course reviews', 'No'],
      ['Adaptive difficulty', 'Stability and difficulty per card', 'Proprietary', 'No'],
      ['Review only weak positions', 'Yes', 'Partly', 'No'],
      ['Avoid replaying whole files', 'Yes', 'Depends on course settings', 'Manual only'],
    ],
  },
  {
    label: 'Repertoire structure',
    rows: [
      ['Transposition handling', 'Position-first model', 'Limited', 'Manual'],
      ['Merge multiple courses', 'Yes, repertoire view', 'No personal merged tree', 'Manual chapters'],
      ['White and Black side filtering', 'Yes', 'Course-level only', 'Manual'],
      ['Preferred branch choices', 'Yes', 'No', 'No'],
      ['Notes shared across transpositions', 'Yes', 'Limited', 'No automatic merge'],
    ],
  },
  {
    label: 'Game repair',
    rows: [
      ['Pull recent Lichess games', 'Yes', 'No', 'Native games exist separately'],
      ['Pull recent Chess.com games', 'Yes', 'No', 'No'],
      ['Find first out-of-book move', 'Yes', 'No', 'No'],
      ['Annotate analyzed games per ply', 'Yes', 'No', 'Study comments only'],
      ['Turn deviation into study work', 'Yes', 'Manual', 'Manual'],
    ],
  },
  {
    label: 'Sharing and ownership',
    rows: [
      ['Share course, chapter, or line', 'Yes', 'Course access model', 'Study link'],
      ['Share analyzed game', 'Yes', 'No', 'Game link, not repertoire-aware'],
      ['Copy shared material into own library', 'Yes, with copy access', 'Buy/enroll model', 'Clone study manually'],
      ['PGN export', 'Yes', 'Limited', 'Yes'],
      ['Full JSON archive', 'Yes', 'No', 'No'],
    ],
  },
];

const summaryCards = [
  {
    title: 'Compared with Chessable',
    body:
      'Chessable is strongest when you want polished paid instruction and video-led courses. RepDrill is for players who already keep PGNs, want control over their prep, and need a calmer review queue tied to their own games.',
  },
  {
    title: 'Compared with Lichess Study',
    body:
      'Lichess Study is excellent for public analysis trees and lightweight sharing. RepDrill adds FSRS scheduling, transposition-aware repertoire memory, online-game deviation checks, and structured copy/share permissions.',
  },
  {
    title: 'Where RepDrill is different',
    body:
      'The product loop is build, drill, repair. Import or create lines, review due positions, then use real games to discover the next gap instead of guessing what to study.',
  },
];

export default async function ComparisonPage() {
  const isLoggedIn = await isAuthenticated();
  const ctaHref = isLoggedIn ? '/courses' : '/sign-in';
  const ctaLabel = isLoggedIn ? 'Open library' : 'Start studying';

  return (
    <div className="min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)]">
      <LandingNav ctaHref={ctaHref} ctaLabel={ctaLabel} isLoggedIn={isLoggedIn} />

      <section className="mx-auto w-full max-w-7xl px-5 pb-12 pt-24 md:px-10 md:pb-16 md:pt-28 lg:px-14">
        <LandingReveal>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--library-green)]">
                Feature comparison
              </p>
              <h1 className="mt-5 max-w-4xl font-display text-[3.25rem] font-semibold leading-[0.95] tracking-[-0.055em] text-[color:var(--ink)] md:text-6xl">
                RepDrill vs Chessable courses vs Lichess Study
              </h1>
            </div>
            <div className="lg:col-span-4 lg:col-start-9 lg:pt-12">
              <p className="text-[15px] leading-7 text-[color:var(--ink-soft)]">
                The comparison focuses on opening-prep workflow: building lines, remembering
                positions, repairing from games, sharing material, and keeping data portable.
              </p>
              <Link
                href={ctaHref}
                className="mt-7 inline-flex min-h-11 items-center rounded-md border border-[color:var(--ink)] bg-[color:var(--ink)] px-4 text-sm font-semibold text-[color:var(--paper)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--library-green)]"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </LandingReveal>

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {summaryCards.map((card, index) => (
            <LandingReveal key={card.title} delay={index * 80}>
              <article className="h-full rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-5 shadow-[0_14px_34px_rgba(47,58,50,0.05)]">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                  {card.title}
                </h2>
                <p className="mt-4 text-[14px] leading-7 text-[color:var(--ink-soft)]">
                  {card.body}
                </p>
              </article>
            </LandingReveal>
          ))}
        </div>
      </section>

      <section className="border-y border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 md:px-10 md:py-16 lg:px-14">
          <LandingReveal>
            <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  Detailed matrix
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-[color:var(--ink)] md:text-5xl">
                  Feature comparison
                </h2>
              </div>
              <p className="max-w-md text-[13px] leading-6 text-[color:var(--ink-faint)]">
                Built from RepDrill&apos;s current feature document plus practical platform differences
                users care about when choosing where to keep opening prep.
              </p>
            </div>
          </LandingReveal>

          <div className="overflow-x-auto rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--paper)] shadow-[0_24px_70px_rgba(47,58,50,0.08)]">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[color:var(--paper-rule)]">
                  <th className="w-[32%] px-5 py-5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                    Features
                  </th>
                  {competitors.map((name) => (
                    <th key={name} className="px-5 py-5 text-[14px] font-semibold text-[color:var(--ink)]">
                      {name}
                      {name === 'RepDrill' && (
                        <span className="ml-2 rounded-sm border border-[color:var(--gilt)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[color:var(--gilt)]">
                          Focused
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <TableSection key={section.label} label={section.label} rows={section.rows} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 md:px-10 md:py-16 lg:grid-cols-12 lg:px-14">
        <LandingReveal className="lg:col-span-7">
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-[color:var(--ink)] md:text-5xl">
            Pick RepDrill when your opening work starts from your own games and files.
          </h2>
        </LandingReveal>
        <LandingReveal className="lg:col-span-4 lg:col-start-9" delay={120}>
          <p className="text-[15px] leading-7 text-[color:var(--ink-soft)]">
            Chessable is a content platform. Lichess Study is an analysis notebook. RepDrill is
            the web platform for turning personal repertoire trees into scheduled recall and
            post-game repair.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-4 text-sm font-semibold text-[color:var(--ink)] transition-colors duration-200 hover:border-[color:var(--library-green)] hover:text-[color:var(--library-green)]"
            >
              Back to landing
            </Link>
            <Link
              href={ctaHref}
              className="inline-flex min-h-11 items-center rounded-md bg-[color:var(--ink)] px-4 text-sm font-semibold text-[color:var(--paper)] transition-colors duration-200 hover:bg-[color:var(--library-green)]"
            >
              {ctaLabel}
            </Link>
          </div>
        </LandingReveal>
      </section>
    </div>
  );
}

function TableSection({
  label,
  rows,
}: {
  label: string;
  rows: string[][];
}) {
  return (
    <>
      <tr>
        <td
          colSpan={4}
          className="bg-[color:var(--paper-shade)] px-5 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[color:var(--ink-soft)]"
        >
          {label}
        </td>
      </tr>
      {rows.map(([feature, repdrill, chessable, lichess]) => (
        <tr key={`${label}-${feature}`} className="border-b border-[color:var(--paper-rule)]/70 last:border-b-0">
          <th className="px-5 py-3 text-[13px] font-medium text-[color:var(--ink)]">
            {feature}
          </th>
          {[repdrill, chessable, lichess].map((value, index) => (
            <td
              key={`${feature}-${index}`}
              className={`px-5 py-3 align-top text-[13px] leading-6 ${
                index === 0 ? 'font-semibold text-[color:var(--library-green)]' : 'text-[color:var(--ink-soft)]'
              }`}
            >
              {value}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
