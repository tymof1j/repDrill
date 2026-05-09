import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { MobileNav, SidebarNav } from './SidebarNav';

export async function Sidebar() {
  const session = await auth();

  return (
    <>
      <MobileNav />
      <aside className="relative z-30 hidden w-72 shrink-0 p-4 md:block">
        <div className="flex h-[calc(100dvh-2rem)] flex-col rounded-2xl border border-[#263337] bg-[#10191b]/[0.94] p-2 shadow-[0_24px_72px_rgba(0,0,0,0.30),inset_0_1px_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl">
        <div className="px-4 py-5">
          <Link
            href="/"
            className="rounded-lg text-sm font-semibold uppercase tracking-[0.2em] text-[#f4faf7] transition-colors duration-200 hover:text-[#7dd3c7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10191b]"
          >
            RepDrill
          </Link>
          <p className="mt-2 text-xs leading-5 text-[#8fa3a0]">Opening memory workspace</p>
        </div>

        <SidebarNav />

        <div className="rounded-xl border border-[#263337] bg-[#152023] p-3">
          {session?.user ? (
            <div className="flex flex-col gap-3">
              <div className="px-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3a0]">
                  Signed in
                </p>
                <p className="mt-1 truncate text-xs text-[#dfe8e4]">{session.user.email}</p>
              </div>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#9fb0aa] transition-colors duration-200 hover:bg-[#223034] hover:text-[#f4faf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10191b] active:scale-[0.98]"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2.5 text-xs font-semibold text-[#dfe8e4] transition-colors duration-200 hover:bg-[#223034] hover:text-[#f4faf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10191b]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      </aside>
    </>
  );
}
