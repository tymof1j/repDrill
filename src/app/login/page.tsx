import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/courses');

  const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <div className="relative min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)]">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* Left: frontispiece */}
        <div className="relative flex flex-col justify-between border-b border-[color:var(--paper-edge)] px-6 py-12 md:px-12 md:py-16 lg:border-b-0 lg:border-r">
          <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--paper-edge)] pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              Frontispiece
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              Vol. I
            </p>
          </div>
          <div className="my-12">
            <p className="font-display-italic text-base text-[color:var(--ink-soft)]">
              A manual of opening memory,
            </p>
            <h1 className="mt-3 font-display text-[16vw] font-medium leading-[0.86] tracking-[-0.04em] text-[color:var(--ink)] md:text-[12vw] lg:text-[10rem]">
              Rep<span className="font-display-italic text-[color:var(--margin-red)]">D</span>rill
            </h1>
            <p className="mt-6 max-w-md font-display-italic text-lg leading-relaxed text-[color:var(--ink-soft)]">
              Open your courses, review what is due, and keep the work in one quiet place.
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            for the studious player
          </p>
        </div>

        {/* Right: sign-in card */}
        <div className="flex items-center justify-center px-6 py-12 md:px-12 md:py-16">
          <div className="w-full max-w-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Authentication — § 1
            </p>
            <h2 className="mt-6 font-display text-4xl font-medium leading-[1.05] tracking-[-0.01em] text-[color:var(--ink)] md:text-5xl">
              Sign in to your <span className="font-display-italic">repertoire</span>.
            </h2>
            <p className="mt-5 font-display-italic text-base leading-relaxed text-[color:var(--ink-soft)]">
              RepDrill ties your library to your account. Nothing leaves the host you run it on.
            </p>

            {googleConfigured ? (
              <form
                className="mt-10"
                action={async () => {
                  'use server';
                  await signIn('google', { redirectTo: '/courses' });
                }}
              >
                <button
                  type="submit"
                  className="group inline-flex w-full items-center justify-center gap-3 border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 py-4 font-mono text-[11px] font-semibold uppercase tracking-[0.20em] text-[color:var(--paper)] transition-colors duration-300 hover:bg-[color:var(--margin-red)] hover:border-[color:var(--margin-red)]"
                >
                  Continue with Google
                  <span aria-hidden className="h-px w-4 bg-current transition-all duration-300 group-hover:w-7" />
                </button>
              </form>
            ) : (
              <div className="mt-10 border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-[color:var(--gilt)]">
                  Configuration required
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
                  Set <code className="notation text-[color:var(--ink)]">AUTH_GOOGLE_ID</code> and{' '}
                  <code className="notation text-[color:var(--ink)]">AUTH_GOOGLE_SECRET</code> in{' '}
                  <code className="notation text-[color:var(--ink)]">.env.local</code>, then restart the dev server.
                </p>
              </div>
            )}

            <p className="mt-12 border-t border-[color:var(--paper-rule)] pt-6 font-mono text-[10px] uppercase tracking-[0.20em] text-[color:var(--ink-faint)]">
              Self-hosted · open source · AGPL-3
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
