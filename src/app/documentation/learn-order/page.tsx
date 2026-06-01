import type { Metadata } from 'next';
import { DocLayout } from '../DocLayout';

export const metadata: Metadata = {
  title: 'Learn line order — FAQ · RepDrill',
  description:
    'How Learn/review selects and orders lines, including due/new priority and the post-import chapter reorder rule.',
};

const sections = [
  { id: 'selection', label: 'How lines are selected' },
  { id: 'ordering', label: 'How lines are ordered' },
  { id: 'import-rule', label: 'Post-import chapter reorder rule' },
  { id: 'notes', label: 'Practical notes' },
];

export default function LearnOrderDocPage() {
  return (
    <DocLayout sections={sections}>
      <header className="mb-10 border-b border-[color:var(--paper-rule)] pb-8">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">
          Learn
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)] md:text-4xl">
          What is the order of lines in Learn mode?
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
          Learn/review is urgency-first. RepDrill picks actionable lines first, then sorts them by
          recall priority.
        </p>
      </header>

      <section id="selection" className="scroll-mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          How lines are selected
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          <li>Include training lines that are due now or contain at least one new card.</li>
          <li>Include info-only lines as one-time view items (until viewed once).</li>
          <li>Hide already-viewed info-only lines on future Learn sessions for that user.</li>
        </ol>
      </section>

      <section id="ordering" className="mt-10 scroll-mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          How lines are ordered
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          <li>Sort non-new lines before new lines.</li>
          <li>Inside each group, sort by due-count descending (more overdue cards first).</li>
        </ol>
      </section>

      <section id="import-rule" className="mt-10 scroll-mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          Post-import chapter reorder rule
        </h2>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          If you reorder chapters within 10 minutes after importing a course, Learn/review uses
          that chapter order as a tie-breaker when urgency is equal. This is most noticeable when
          many lines are still new.
        </p>
      </section>

      <section id="notes" className="mt-10 scroll-mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          Practical notes
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          <li>Learn order is not a pure table-of-contents order by default.</li>
          <li>FSRS urgency still dominates chapter order whenever due/new priority differs.</li>
          <li>The import-behavior FAQ also documents this rule from the import perspective.</li>
        </ul>
      </section>
    </DocLayout>
  );
}

