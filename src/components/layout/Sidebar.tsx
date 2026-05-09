import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { MobileNav, SidebarNav } from './SidebarNav';

export async function Sidebar() {
  const session = await auth();

  return (
    <>
      <MobileNav />
      <aside className="relative z-30 hidden w-72 shrink-0 bg-[color:var(--paper)] md:block">
        <div className="sticky top-0 flex h-screen flex-col px-7 py-9">
          <div>
            <Link
              href="/"
              className="group block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
                A manual of
              </p>
              <h1 className="mt-1 font-display text-[2rem] font-medium leading-none tracking-[-0.01em] text-[color:var(--ink)] transition-colors duration-200 group-hover:text-[color:var(--margin-red)]">
                RepDrill
              </h1>
              <p className="mt-1 font-display-italic text-sm text-[color:var(--ink-faint)]">
                opening memory
              </p>
            </Link>
          </div>

          <div className="mt-10 mb-4 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            <span aria-hidden className="h-px flex-1 bg-[color:var(--paper-edge)]" />
            <span>Index</span>
            <span aria-hidden className="h-px flex-1 bg-[color:var(--paper-edge)]" />
          </div>

          <SidebarNav />

          <div className="mt-auto pt-6">
            <div className="mb-4 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              <span aria-hidden className="h-px flex-1 bg-[color:var(--paper-edge)]" />
              <span>Colophon</span>
              <span aria-hidden className="h-px flex-1 bg-[color:var(--paper-edge)]" />
            </div>
            {session?.user ? (
              <div className="space-y-3">
                <p className="truncate font-display-italic text-sm text-[color:var(--ink-soft)]">
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
                    className="group inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[6px] transition-colors duration-200 hover:text-[color:var(--margin-red)] hover:decoration-[color:var(--margin-red)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
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
                className="group inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[6px] transition-colors duration-200 hover:text-[color:var(--margin-red)] hover:decoration-[color:var(--margin-red)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
              >
                Sign in
                <span
                  aria-hidden
                  className="h-px w-3 bg-current transition-all duration-200 group-hover:w-5"
                />
              </Link>
            )}
            <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.24em] text-[color:var(--ink-ghost)]">
              Vol. I — Repertoire trainer
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
