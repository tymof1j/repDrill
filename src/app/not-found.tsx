import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
        Error · 404
      </p>
      <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-0.02em] text-[color:var(--ink)] md:text-6xl">
        Page not found.
      </h1>
      <p className="mt-4 max-w-xl font-display-italic text-[18px] text-[color:var(--ink-soft)]">
        This link does not point to an existing page. Check the URL or return to your workspace.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/analyze"
          className="inline-flex min-h-10 items-center border border-[color:var(--ink)] bg-[color:var(--ink)] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] transition-colors duration-200 hover:bg-[color:var(--ink-faint)]"
        >
          Back to analyze
        </Link>
        <Link
          href="/courses"
          className="inline-flex min-h-10 items-center border border-[color:var(--paper-edge)] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink)] transition-colors duration-200 hover:border-[color:var(--ink)]"
        >
          Open courses
        </Link>
      </div>
    </section>
  );
}
