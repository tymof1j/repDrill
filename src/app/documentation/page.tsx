import type { Metadata } from 'next';
import Link from 'next/link';
import { AppSurface, PageHeader, PremiumPanel } from '@/components/ui/Premium';

export const metadata: Metadata = {
  title: 'Documentation · RepDrill',
  description:
    'How RepDrill works — move notation, spaced repetition, and the FSRS algorithm.',
};

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
    <AppSurface>
      <PageHeader
        eyebrow="Documentation"
        title={
          <>
            How RepDrill <span className="font-display-italic">works</span>.
          </>
        }
        body="Short explainers on the moving parts — what the inputs accept, why spaced repetition matters, and which scheduler runs the training loop."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group block focus-visible:outline-none"
          >
            <PremiumPanel
              className="h-full transition-shadow duration-200 group-hover:shadow-[0_24px_70px_rgba(47,58,50,0.12)] group-focus-visible:ring-2 group-focus-visible:ring-[color:var(--library-green)]"
              innerClassName="flex h-full flex-col px-6 py-7 md:px-7 md:py-8"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                {t.eyebrow}
              </span>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] transition-colors duration-200 group-hover:text-[color:var(--library-green)]">
                {t.title}
              </h2>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
                {t.body}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-faint)] transition-colors duration-200 group-hover:text-[color:var(--library-green)]">
                Read
                <span
                  aria-hidden
                  className="h-px w-3 bg-current transition-all duration-200 group-hover:w-6"
                />
              </span>
            </PremiumPanel>
          </Link>
        ))}
      </div>
    </AppSurface>
  );
}
