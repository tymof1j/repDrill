import type { Metadata } from 'next';
import Link from 'next/link';
import { DocLayout } from './DocLayout';

export const metadata: Metadata = {
  title: 'FAQ · RepDrill',
  description:
    'RepDrill FAQ — keyboard shortcuts, move notation, spaced repetition, and the FSRS algorithm.',
};

const sections = [
  { id: 'advantages', label: 'Advantages' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
  { id: 'topics', label: 'FAQ topics' },
];

const advantages = [
  {
    title: 'Position-first repertoire memory',
    body:
      'RepDrill stores learning around board positions, not only around a single move-order path. If a Catalan, Queen\'s Gambit, or Grunfeld line reaches the same FEN through a transposition, the note and review context stay attached to that position.',
  },
  {
    title: 'FSRS review instead of fixed repetition',
    body:
      'Training uses the Free Spaced Repetition Scheduler through ts-fsrs. Each answer updates stability and difficulty, so daily practice focuses on weak positions instead of making you replay every line in a course.',
  },
  {
    title: 'Real-game repair loop',
    body:
      'The Analyze workspace pulls Lichess or Chess.com games, walks through the PGN, and marks the first move where your play left the repertoire. That turns a surprise from an online game into a concrete position to annotate, import, or drill.',
  },
  {
    title: 'Merged repertoires for both colors',
    body:
      'Courses can remain clean and separate, while repertoires combine them into a single tree. The side selector keeps White and Black preparation readable, and preferred choices resolve overlapping branches.',
  },
  {
    title: 'Share exact study material',
    body:
      'You can share a course, chapter, line, repertoire, or analyzed game through a link or email invite. Viewers can receive read-only access or copy access, so collaboration does not require screenshots or pasted PGNs.',
  },
  {
    title: 'Portable prep, synced workspace',
    body:
      'Convex gives the web app reactive sync and protected writes, while PGN and JSON exports keep the library portable. The goal is to keep prep usable inside RepDrill without locking it there.',
  },
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
      ['H', 'Show or hide piece highlights'],
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
          RepDrill is built around repertoire memory, not passive course watching. These notes
          explain the practical advantages, keyboard shortcuts, notation input, spaced repetition,
          and the scheduler behind training.
        </p>
      </header>

      <section id="advantages" className="scroll-mt-20">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Advantages
        </p>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
          What RepDrill gives you
        </h2>
        <div className="mt-5 divide-y divide-[color:var(--paper-rule)] border-y border-[color:var(--paper-rule)]">
          {advantages.map((item, index) => (
            <article key={item.title} className="grid gap-4 py-5 md:grid-cols-[4rem_1fr]">
              <p className="font-mono text-[11px] font-semibold text-[color:var(--library-green)]">
                {String(index + 1).padStart(2, '0')}
              </p>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[color:var(--ink)]">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
                  {item.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

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
