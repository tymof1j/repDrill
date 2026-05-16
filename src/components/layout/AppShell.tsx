'use client';

import { usePathname } from 'next/navigation';
import { GlobalShortcuts } from './GlobalShortcuts';

export function AppShell({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicPage =
    pathname === '/' || pathname === '/comparison' || pathname === '/login' || pathname.startsWith('/share/');
  const isFaqPage = pathname === '/documentation' || pathname.startsWith('/documentation/');

  if (isPublicPage) {
    return (
      <main id="main-content" className="min-h-screen">
        {children}
      </main>
    );
  }

  if (isFaqPage) {
    return (
      <>
        <GlobalShortcuts />
        <main id="main-content" className="min-h-screen bg-[color:var(--paper)]">
          {children}
        </main>
      </>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-[color:var(--paper)]">
      <GlobalShortcuts />
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink)] shadow-[0_12px_32px_rgba(47,58,50,0.10)] transition-transform duration-200 focus:translate-y-0 focus:outline-none"
      >
        Skip to content
      </a>
      {sidebar}
      <main
        id="main-content"
        className="relative flex-1 overflow-y-auto border-l border-[color:var(--paper-rule)] bg-[color:var(--paper)]"
      >
        {children}
      </main>
    </div>
  );
}
