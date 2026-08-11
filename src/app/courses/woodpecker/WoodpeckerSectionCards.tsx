'use client';

import { SecondaryButton } from '@/components/ui/Premium';
import { useBookProgress } from '@/lib/hooks/useBookProgress';
import { getSectionRange } from '@/lib/woodpecker';

const sections = [
  {
    id: 'easy',
    title: 'Easy',
    body: 'Build speed and pattern recognition with compact combinations.',
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    body: 'Calculate deeper positions where the first move is less obvious.',
  },
  {
    id: 'advanced',
    title: 'Advanced',
    body: 'Longer, demanding combinations selected for serious calculation work.',
  },
] as const;

export function WoodpeckerSectionCards() {
  const { progress, isLoading } = useBookProgress('woodpecker-method', 1128);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {sections.map((section) => {
        const range = getSectionRange(section.id);
        const solved = progress?.solved.filter((exercise) => (
          exercise >= range.first && exercise <= range.last
        )).length ?? 0;
        const knownMissed = progress?.missed.filter((exercise) => (
          exercise >= range.first && exercise <= range.last
        )).length ?? 0;
        // A legacy import can honestly retain a missed count without an exact
        // puzzle id. It belongs to the active Easy set rather than being
        // silently dropped from the level summary.
        const unresolvedMissed = section.id === 'easy' ? (progress?.unresolvedMissedCount ?? 0) : 0;
        const missed = knownMissed + unresolvedMissed;
        const percent = Math.min(100, Math.round((solved / range.count) * 100));
        const activeSet = progress?.setSize === range.count && section.id === 'easy';

        return (
          <section
            key={section.id}
            className="flex h-full flex-col rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-6 shadow-[0_18px_55px_rgba(47,58,50,0.08)] md:p-7"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
              Exercises {range.first}–{range.last}
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em]">{section.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[color:var(--ink-soft)]">{section.body}</p>

            <div className="mt-7 border-t border-[color:var(--paper-rule)] pt-5">
              <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
                <span className="text-[color:var(--ink-faint)]">Progress</span>
                <span className="tabular-nums text-[color:var(--ink)]">
                  {isLoading ? 'Loading…' : `${solved} / ${range.count}`}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--paper-deep)]">
                <div
                  className="h-full rounded-full bg-[color:var(--library-green)] transition-[width] duration-500 ease-out"
                  style={{ width: `${isLoading ? 0 : percent}%` }}
                />
              </div>
              <div className="mt-3 flex min-h-4 items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--ink-faint)]">
                  {activeSet ? `Cycle ${progress?.cycle}` : solved > 0 ? `${percent}% complete` : 'Not started'}
                </span>
                {missed > 0 && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--margin-red)]">
                    {missed} missed
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="font-mono text-xs text-[color:var(--ink-faint)]">{range.count} positions</span>
              <SecondaryButton href={`/train/puzzles/woodpecker?n=${range.first}`}>Open set</SecondaryButton>
            </div>
          </section>
        );
      })}
    </div>
  );
}
