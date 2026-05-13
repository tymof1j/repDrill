import Link from 'next/link';
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { redirect } from 'next/navigation';
import { SignInButton } from './SignInButton';

export default async function LoginPage() {
  const isLoggedIn = await isAuthenticatedNextjs();
  if (isLoggedIn) redirect('/courses');

  return (
    <div className="relative min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)]">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <div className="order-2 relative flex flex-col justify-between border-b border-[color:var(--paper-rule)] px-6 py-10 md:px-12 md:py-14 lg:order-1 lg:border-b-0 lg:border-r lg:py-16">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="group flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
            >
              <span aria-hidden className="grid h-9 w-9 place-items-center rounded-md bg-[color:var(--ink)] text-sm font-semibold text-[color:var(--paper)] transition-colors duration-200 group-hover:bg-[color:var(--library-green)]">
                R
              </span>
              <span className="font-display text-lg font-semibold tracking-[-0.03em]">RepDrill</span>
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
              Self-hosted
            </p>
          </div>
          <div className="my-8 lg:my-14">
            <p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--library-green)]" />
              Opening memory
            </p>
            <h1 className="mt-7 max-w-xl font-display text-[3.75rem] font-semibold leading-[0.94] tracking-[-0.06em] text-[color:var(--ink)] md:text-[5rem] lg:text-[5.8rem]">
              Your repertoire, ready to review.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-8 text-[color:var(--ink-soft)]">
              Open your courses, train due lines, and check recent games from one focused workspace.
            </p>
          </div>
          <div className="grid max-w-lg grid-cols-3 gap-3">
            {[
              ['FSRS', 'Recall'],
              ['Convex', 'Storage'],
              ['AGPL-3', 'License'],
            ].map(([value, label]) => (
              <div key={value} className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-3">
                <p className="font-display text-lg font-semibold tracking-[-0.03em] text-[color:var(--ink)]">{value}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 flex items-center justify-center px-6 pb-8 pt-20 md:px-12 md:pb-12 md:pt-24 lg:order-2 lg:py-16">
          <div className="w-full max-w-md rounded-[1.25rem] border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_rgba(47,58,50,0.10)] md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
              Authentication
            </p>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-[color:var(--ink)] md:text-5xl">
              Sign in
            </h2>
            <p className="mt-4 text-base leading-7 text-[color:var(--ink-soft)]">
              RepDrill ties your library to your account. Your data is stored securely in the cloud.
            </p>

            <div className="mt-10">
              <SignInButton />
            </div>

            <p className="mt-10 border-t border-[color:var(--paper-rule)] pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
              Cloud-hosted · Open source · AGPL-3
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
