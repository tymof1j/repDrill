import type { Metadata } from 'next';
import { DocLayout } from '../DocLayout';

export const metadata: Metadata = {
  title: 'PGN import behavior — FAQ · RepDrill',
  description:
    'How RepDrill names chapters on PGN import, detects info-only content, and handles info-only lines in Learn.',
};

const sections = [
  { id: 'naming', label: 'Chapter naming' },
  { id: 'detecting', label: 'Info-only detection' },
  { id: 'mode', label: 'How info-only differs' },
  { id: 'manual', label: 'Manual override' },
];

export default function ImportBehaviorDocPage() {
  return (
    <DocLayout sections={sections}>
      <header className="mb-10 border-b border-[color:var(--paper-rule)] pb-8">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">
          Import
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)] md:text-4xl">
          PGN naming and info-only mode
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
          This page explains exactly how chapter names are chosen during PGN import and how
          info-only chapters/lines behave in viewer and Learn flows.
        </p>
      </header>

      <section id="naming" className="scroll-mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          Chapter naming
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          <li>Use `ChapterName` PGN header if present and not `?`.</li>
          <li>Otherwise use `Event` PGN header if present and not `?`.</li>
          <li>Otherwise use `White` PGN header if present and not `?`.</li>
          <li>
            Otherwise, for single-file upload, use uploaded filename without extension (for example
            `All Lines in One File.pgn` → `All Lines in One File`).
          </li>
          <li>If none of the above are available, fallback to `Chapter N`.</li>
        </ol>
      </section>

      <section id="detecting" className="mt-10 scroll-mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          Info-only detection
        </h2>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          RepDrill auto-marks imported content as info-only if it sees any of these keywords:
          <strong> idea</strong>, <strong>ideas</strong>, <strong>game</strong>,{' '}
          <strong>games</strong>.
        </p>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          Detection checks: uploaded filename, PGN headers, and PGN comments.
        </p>
      </section>

      <section id="mode" className="mt-10 scroll-mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          How info-only differs
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          <li>Visible in course viewer and repertoire viewer like normal lines.</li>
          <li>Included in Learn as a one-time view item.</li>
          <li>Not scheduled with FSRS (no memorization queue behavior).</li>
          <li>After Learn shows it once, it is marked viewed for that user and hidden next time.</li>
        </ul>
      </section>

      <section id="manual" className="mt-10 scroll-mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          Manual override
        </h2>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          In course detail you can manually toggle both chapter and individual lines between
          <strong> training</strong> and <strong>info-only</strong>. Use this when auto-detection
          is not what you want.
        </p>
      </section>
    </DocLayout>
  );
}
