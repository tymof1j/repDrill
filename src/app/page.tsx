import Link from 'next/link';
import { auth } from '@/auth';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingReveal } from '@/components/landing/LandingReveal';

const features = [
  {
    eyebrow: 'Tree memory',
    title: 'Study positions once, then meet them everywhere.',
    body: 'Annotations attach to the position graph, so transpositions stop creating duplicate work.',
  },
  {
    eyebrow: 'FSRS recall',
    title: 'A review queue that respects how memory actually fades.',
    body: 'Again, Hard, Good, and Easy ratings drive a real spaced repetition schedule for every line.',
  },
  {
    eyebrow: 'Game feedback',
    title: 'Find the move where preparation became improvisation.',
    body: 'Analyze online games against your courses and see exactly where you left the book.',
  },
];

const repertoireRows = [
  ['1. d4', 'Nf6', '98%'],
  ['2. c4', 'g6', '92%'],
  ['3. Nc3', 'd5', 'Due'],
  ['4. Nf3', 'Bg7', 'New'],
];

export default async function Home() {
  const session = await auth();
  const ctaHref = session?.user ? '/courses' : '/login';
  const ctaLabel = session?.user ? 'Go to your courses' : 'Sign in to start';

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#050504] text-[#f8f1df]">
      <div className="pointer-events-none fixed inset-0 z-10 opacity-[0.035] [background-image:radial-gradient(#fff_0.8px,transparent_0.8px)] [background-size:10px_10px]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(248,241,223,0.10),transparent_28%,rgba(22,119,83,0.12)_56%,rgba(150,56,42,0.10)_78%,transparent)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(5,5,4,0)_0%,rgba(5,5,4,0.86)_72%,#050504_100%)]" />

      <LandingNav ctaHref={ctaHref} />

      <section className="relative mx-auto grid min-h-[86dvh] w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-28 md:grid-cols-[0.88fr_1.12fr] md:px-8 md:pt-32 lg:px-10">
        <LandingReveal>
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-[#f8f1df]/10 bg-[#f8f1df]/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#c8b68c]">
              Self-hosted chess recall system
            </p>
            <h1 className="mt-7 text-6xl font-semibold leading-[0.92] tracking-normal text-[#fff8e6] sm:text-7xl md:text-8xl">
              RepDrill
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#c9c0aa] md:text-xl">
              Convert opening files into a living training room: graph-based repertoire study,
              FSRS scheduling, and game analysis that shows where your prep runs out.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <PremiumLink href={ctaHref}>{ctaLabel}</PremiumLink>
              <a
                href="#training"
                className="group inline-flex items-center gap-3 rounded-full border border-[#f8f1df]/[0.12] bg-[#f8f1df]/[0.06] px-3 py-3 pl-6 text-sm font-semibold text-[#f8f1df] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                See the workflow
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8f1df]/[0.08] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
                  ↓
                </span>
              </a>
            </div>
          </div>
        </LandingReveal>

        <LandingReveal delay={140}>
          <HeroConsole />
        </LandingReveal>
      </section>

      <section id="training" className="px-4 py-24 md:px-8 md:py-32 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <LandingReveal>
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-[#f8f1df]/10 bg-[#f8f1df]/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#c8b68c]">
                Repertoire operating system
              </p>
              <h2 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-normal text-[#fff8e6] md:text-6xl">
                The line is only the surface. The position is the source of truth.
              </h2>
            </div>
          </LandingReveal>

          <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-12">
            <LandingReveal className="md:col-span-7 md:row-span-2">
              <DoubleBezel className="h-full">
                <div className="flex h-full min-h-[520px] flex-col justify-between bg-[#0b0b09] p-5 md:p-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#877b63]">Course graph</p>
                      <h3 className="mt-2 text-2xl font-semibold text-[#fff8e6]">Grunfeld as Black</h3>
                    </div>
                    <span className="rounded-full bg-[#167753]/[0.16] px-3 py-1 text-xs font-medium text-[#73d5a0]">
                      43 due
                    </span>
                  </div>

                  <div className="mt-8 grid flex-1 grid-cols-8 grid-rows-8 overflow-hidden rounded-[1.5rem] border border-[#f8f1df]/10">
                    {Array.from({ length: 64 }, (_, index) => (
                      <div
                        key={index}
                        className={(Math.floor(index / 8) + index) % 2 === 0 ? 'bg-[#d7c7a2]' : 'bg-[#2d5f49]'}
                      />
                    ))}
                    <div className="col-start-2 row-start-7 flex items-center justify-center text-3xl text-[#13120f]">
                      ♙
                    </div>
                    <div className="col-start-4 row-start-6 flex items-center justify-center text-3xl text-[#13120f]">
                      ♘
                    </div>
                    <div className="col-start-5 row-start-5 flex items-center justify-center text-3xl text-[#f8f1df]">
                      ♟
                    </div>
                    <div className="col-start-7 row-start-3 flex items-center justify-center text-3xl text-[#f8f1df]">
                      ♝
                    </div>
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-4">
                    {['Again', 'Hard', 'Good', 'Easy'].map((rating, index) => (
                      <button
                        key={rating}
                        className={`rounded-full px-4 py-3 text-sm font-semibold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                          index === 2
                            ? 'bg-[#f8f1df] text-[#0b0b09]'
                            : 'bg-[#f8f1df]/[0.07] text-[#d8cfba] hover:bg-[#f8f1df]/[0.12]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
              </DoubleBezel>
            </LandingReveal>

            {features.map((feature, index) => (
              <LandingReveal key={feature.title} className="md:col-span-5" delay={index * 110}>
                <DoubleBezel>
                  <article className="min-h-[248px] bg-[#0d0c0a] p-6">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#c8b68c]">
                      {feature.eyebrow}
                    </p>
                    <h3 className="mt-5 text-2xl font-semibold leading-tight text-[#fff8e6]">
                      {feature.title}
                    </h3>
                    <p className="mt-5 text-sm leading-6 text-[#a99f89]">{feature.body}</p>
                  </article>
                </DoubleBezel>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="analysis" className="px-4 py-24 md:px-8 md:py-32 lg:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-10 md:grid-cols-[0.85fr_1.15fr]">
          <LandingReveal>
            <div>
              <p className="inline-flex rounded-full border border-[#f8f1df]/10 bg-[#f8f1df]/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#c8b68c]">
                Practice signal
              </p>
              <h2 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-normal text-[#fff8e6] md:text-6xl">
                Review the moves that actually need you.
              </h2>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#b9af98]">
                RepDrill turns PGN courses into a calm queue: import, drill, grade the recall,
                then use your own games to sharpen the next study block.
              </p>
            </div>
          </LandingReveal>

          <LandingReveal delay={120}>
            <DoubleBezel>
              <div className="bg-[#0b0b09] p-4 md:p-6">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ['Due today', '43', '#73d5a0'],
                    ['New lines', '18', '#d7b46a'],
                    ['In book', '91%', '#e88a72'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="rounded-[1.25rem] bg-[#f8f1df]/[0.06] p-5">
                      <p className="text-xs text-[#91866e]">{label}</p>
                      <p className="mt-4 text-4xl font-semibold" style={{ color }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 overflow-hidden rounded-[1.5rem] bg-[#f8f1df]/[0.06]">
                  {repertoireRows.map(([move, response, status], index) => (
                    <div
                      key={move}
                      className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 border-b border-[#f8f1df]/[0.08] px-5 py-4 last:border-b-0"
                    >
                      <span className="font-mono text-sm text-[#f8f1df]">{move}</span>
                      <span className="font-mono text-sm text-[#c8b68c]">{response}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          index < 2
                            ? 'bg-[#167753]/[0.18] text-[#73d5a0]'
                            : 'bg-[#96382a]/[0.18] text-[#e88a72]'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </DoubleBezel>
          </LandingReveal>
        </div>
      </section>

      <section id="stack" className="px-4 py-24 md:px-8 md:py-32 lg:px-10">
        <LandingReveal>
          <div className="mx-auto max-w-7xl">
            <DoubleBezel>
              <div className="grid gap-10 bg-[#f8f1df] p-6 text-[#0b0b09] md:grid-cols-[1fr_auto] md:p-10">
                <div>
                  <p className="inline-flex rounded-full bg-[#0b0b09]/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6d614d]">
                    Built for ownership
                  </p>
                  <h2 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-normal md:text-6xl">
                    Open source, local-first in spirit, and ready for serious opening work.
                  </h2>
                </div>
                <div className="grid content-end gap-3 sm:grid-cols-3 md:w-[420px] md:grid-cols-1">
                  {['Next.js app', 'SQLite storage', 'FSRS scheduler'].map((item) => (
                    <div key={item} className="rounded-full bg-[#0b0b09]/[0.06] px-5 py-4 text-sm font-semibold">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </DoubleBezel>
          </div>
        </LandingReveal>
      </section>
    </div>
  );
}

function PremiumLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 rounded-full bg-[#f8f1df] px-3 py-3 pl-6 text-sm font-semibold text-[#0b0b09] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
    >
      {children}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b0b09]/[0.08] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
        ↗
      </span>
    </Link>
  );
}

function DoubleBezel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] border border-[#f8f1df]/10 bg-[#f8f1df]/[0.06] p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] ${className}`}
    >
      <div className="h-full overflow-hidden rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.10)]">
        {children}
      </div>
    </div>
  );
}

function HeroConsole() {
  return (
    <DoubleBezel>
      <div className="bg-[#0b0b09] p-4 md:p-6">
        <div className="flex items-center justify-between border-b border-[#f8f1df]/[0.08] pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#877b63]">Live session</p>
            <h2 className="mt-2 text-xl font-semibold text-[#fff8e6]">Queen&apos;s Gambit Declined</h2>
          </div>
          <div className="rounded-full bg-[#167753]/[0.16] px-3 py-1 text-xs font-medium text-[#73d5a0]">
            FSRS ready
          </div>
        </div>

        <div className="grid gap-4 pt-5 md:grid-cols-[1fr_0.78fr]">
          <div className="rounded-[1.5rem] bg-[#f8f1df]/[0.06] p-3">
            <div className="grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-[1.2rem]">
              {Array.from({ length: 64 }, (_, index) => (
                <div
                  key={index}
                  className={(Math.floor(index / 8) + index) % 2 === 0 ? 'bg-[#d7c7a2]' : 'bg-[#2d5f49]'}
                />
              ))}
              <div className="col-start-4 row-start-8 flex items-center justify-center text-2xl text-[#13120f] md:text-3xl">
                ♔
              </div>
              <div className="col-start-4 row-start-4 flex items-center justify-center text-2xl text-[#13120f] md:text-3xl">
                ♙
              </div>
              <div className="col-start-5 row-start-5 flex items-center justify-center text-2xl text-[#f8f1df] md:text-3xl">
                ♟
              </div>
              <div className="col-start-6 row-start-1 flex items-center justify-center text-2xl text-[#f8f1df] md:text-3xl">
                ♚
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-[1.5rem] bg-[#f8f1df]/[0.06] p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#877b63]">Prompt</p>
              <p className="mt-4 text-2xl font-semibold leading-tight text-[#fff8e6]">
                Find Black&apos;s reply after 5. Bg5.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#f8f1df]/[0.06] p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#877b63]">Memory trace</p>
              <div className="mt-5 space-y-3">
                {[
                  ['last seen', '3d'],
                  ['stability', '18.6'],
                  ['difficulty', '6.1'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-[#9f947c]">{label}</span>
                    <span className="font-mono text-[#f8f1df]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-full bg-[#96382a]/[0.18] px-4 py-3 text-center text-sm font-semibold text-[#e88a72]">
                Hard
              </div>
              <div className="rounded-full bg-[#167753]/[0.18] px-4 py-3 text-center text-sm font-semibold text-[#73d5a0]">
                Good
              </div>
            </div>
          </div>
        </div>
      </div>
    </DoubleBezel>
  );
}
