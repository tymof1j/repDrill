import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { MobileNav, SidebarNav } from './SidebarNav';
import { ThemeToggle } from './ThemeToggle';

export async function Sidebar() {
  const session = await auth();

  return (
    <>
      <MobileNav />
      <aside className="relative z-30 hidden w-72 shrink-0 bg-[color:var(--surface)] md:block">
        <div className="sticky top-0 flex h-screen flex-col px-5 py-5">
          <div>
            <Link
              href="/"
              className="group flex items-center gap-3 rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-3 shadow-[0_12px_32px_rgba(47,58,50,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
            >
              <span aria-hidden className="grid h-9 w-9 place-items-center rounded-md bg-[color:var(--ink)] text-sm font-semibold text-[color:var(--paper)] transition-colors duration-200 group-hover:bg-[color:var(--library-green)]">
                R
              </span>
              <span>
                <span className="block font-display text-lg font-semibold leading-none tracking-[-0.03em] text-[color:var(--ink)]">
                  RepDrill
                </span>
                <span className="mt-1 block text-xs text-[color:var(--ink-faint)]">
                  Opening memory
                </span>
              </span>
            </Link>
          </div>

          <div className="mt-8 mb-3 flex items-center gap-2 px-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--library-green)]" />
            <span>Workspace</span>
          </div>

          <SidebarNav />

          <div className="mt-auto pt-6">
            <ThemeToggle />
            <Link
              href="/documentation"
              className="group mt-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[color:var(--ink-soft)] transition-colors duration-200 hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-faint)]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
                    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
                  </svg>
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold leading-tight text-[color:var(--ink)]">
                    Documentation
                  </span>
                  <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                    Notation · method · FSRS
                  </span>
                </span>
              </span>
              <span
                aria-hidden
                className="h-px w-3 bg-[color:var(--paper-edge)] transition-all duration-200 group-hover:w-5 group-hover:bg-[color:var(--library-green)]"
              />
            </Link>
            <div className="mt-6 mb-4 flex items-center gap-2 px-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--paper-edge)]" />
              <span>Account</span>
            </div>
            {session?.user ? (
              <div className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] p-3">
                <p className="truncate text-sm text-[color:var(--ink-soft)]">
                  {session.user.email}
                </p>
                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/' });
                  }}
                >
                  <button
                    type="submit"
                    className="group mt-3 inline-flex items-center gap-2 rounded-md font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[6px] transition-colors duration-200 hover:text-[color:var(--library-green)] hover:decoration-[color:var(--library-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
                  >
                    Sign out
                    <span
                      aria-hidden
                      className="h-px w-3 bg-current transition-all duration-200 group-hover:w-5"
                    />
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-md font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[6px] transition-colors duration-200 hover:text-[color:var(--library-green)] hover:decoration-[color:var(--library-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
              >
                Sign in
                <span
                  aria-hidden
                  className="h-px w-3 bg-current transition-all duration-200 group-hover:w-5"
                />
              </Link>
            )}
            <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.24em] text-[color:var(--ink-ghost)]">
              Self-hosted repertoire trainer
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
