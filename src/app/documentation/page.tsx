import type { Metadata } from 'next';
import Link from 'next/link';
import { DocLayout } from './DocLayout';

export const metadata: Metadata = {
  title: 'FAQ · RepDrill',
  description:
    'RepDrill FAQ — keyboard shortcuts, move notation, spaced repetition, and the FSRS algorithm.',
};

const sections = [
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
  { id: 'topics', label: 'FAQ topics' },
];

const shortcutGroups = [
  {
    label: 'Workspace',
    items: [
      ['C', 'Courses'],
      ['R', 'Repertoires'],
      ['T', 'Train'],
      ['A', 'Analyze'],
    ],
  },
  {
    label: 'Tree views',
    items: [
      ['← / →', 'Back and forward through the current line'],
      ['↑ / ↓', 'Cycle sibling branches'],
      ['1-9', 'Jump to a numbered branch'],
      ['Home / End', 'Jump to the root or deepest known move'],
      ['V', 'Show or hide branch arrows'],
      ['/', 'Search annotations'],
    ],
  },
  {
    label: 'Training',
    items: [
      ['Tab', 'Switch between board input and notation input when a prompt is waiting'],
      ['Enter', 'Submit the notation input'],
    ],
  },
];

const topics = [
  {
    href: '/documentation/notation',
    eyebrow: 'Input',
    title: 'Move notation',
    body: 'The two notation styles the keyboard input accepts (SAN and Short), with the disambiguation rules and English-letter requirement.',
  },
  {
    href: '/documentation/spaced-repetition',
    eyebrow: 'Method',
    title: 'Why spaced repetition',
    body: 'How recall-with-spacing beats re-reading and bulk drilling for long-term retention of opening lines.',
  },
  {
    href: '/documentation/fsrs',
    eyebrow: 'Scheduler',
    title: 'Why FSRS',
    body: 'What the Free Spaced Repetition Scheduler does differently from SM-2 (Anki), and why RepDrill uses it for line scheduling.',
  },
];

export default function DocumentationIndexPage() {
  return (
    <DocLayout sections={sections}>
      <header className="mb-10 border-b border-[color:var(--paper-rule)] pb-8">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">
          FAQ
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)] md:text-4xl">
          How RepDrill works
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
          The practical bits first: keyboard shortcuts, then short explainers on notation,
          spaced repetition, and the scheduler behind training.
        </p>
      </header>

      <section id="shortcuts" className="scroll-mt-20">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Keyboard
        </p>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          Shortcuts
        </h2>
        <div className="mt-5 divide-y divide-[color:var(--paper-rule)] border-y border-[color:var(--paper-rule)]">
          {shortcutGroups.map((group) => (
            <section key={group.label} className="grid gap-4 py-5 md:grid-cols-[9rem_1fr]">
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                {group.label}
              </h3>
              <dl className="grid gap-3">
                {group.items.map(([keys, description]) => (
                  <div key={keys} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-4">
                    <dt className="notation text-[12px] font-semibold text-[color:var(--ink)]">
                      {keys}
                    </dt>
                    <dd className="text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
                      {description}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </section>

      <section id="topics" className="mt-12 scroll-mt-20">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Read next
        </p>
        <div className="space-y-4">
          {topics.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group flex items-start gap-4 rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-5 transition-all duration-200 hover:border-[color:var(--library-green)]/30 hover:shadow-[0_12px_36px_rgba(47,58,50,0.08)]"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  {t.eyebrow}
                </p>
                <h2 className="mt-1.5 text-[16px] font-semibold text-[color:var(--ink)] transition-colors duration-200 group-hover:text-[color:var(--library-green)]">
                  {t.title}
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
                  {t.body}
                </p>
              </div>
              <span
                aria-hidden
                className="mt-2 text-[color:var(--ink-faint)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[color:var(--library-green)]"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </DocLayout>
  );
}
