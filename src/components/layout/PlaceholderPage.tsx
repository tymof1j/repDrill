import { AppSurface, PageHeader, Stamp } from '@/components/ui/Premium';

export function PlaceholderPage({ title, body }: { title: string; body: string }) {
  return (
    <AppSurface>
      <PageHeader eyebrow="Part IV — Analysis" title={title} body={body} />

      <section className="border-y border-[color:var(--paper-edge)] py-16 text-center">
        <Stamp tone="gold" rotate>
          Forthcoming
        </Stamp>
        <h2 className="mt-8 font-display text-4xl font-medium leading-[1.05] tracking-[-0.01em] text-[color:var(--ink)] md:text-5xl">
          To appear in <span className="font-display-italic">Volume II</span>.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl font-display-italic text-lg leading-relaxed text-[color:var(--ink-soft)]">
          Pull recent games from Lichess and Chess.com, mark the move where you departed
          from preparation, and feed those positions back into the review queue.
        </p>
        <ol className="mx-auto mt-12 grid max-w-3xl gap-y-6 text-left md:grid-cols-3 md:gap-x-8">
          {[
            ['I', 'Connect a chess account', 'Pull your recent games via the public APIs.'],
            ['II', 'Detect deviations', 'Compare each move against your repertoire tree.'],
            ['III', 'Schedule the gap', 'Promote the deviation point into the FSRS queue.'],
          ].map(([n, t, b]) => (
            <li key={n} className="border-l border-[color:var(--paper-rule)] pl-5">
              <p
                className="font-display text-3xl italic text-[color:var(--margin-red)]"
                style={{ fontFeatureSettings: '"onum"' }}
              >
                {n}.
              </p>
              <h3 className="mt-2 font-display text-lg font-medium text-[color:var(--ink)]">
                {t}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
                {b}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </AppSurface>
  );
}
