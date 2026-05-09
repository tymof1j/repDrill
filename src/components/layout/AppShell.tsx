'use client';

import { usePathname } from 'next/navigation';

export function AppShell({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicPage =
    pathname === '/' || pathname === '/login' || pathname.startsWith('/share/');

  if (isPublicPage) {
    return (
      <main id="main-content" className="min-h-screen">
        {children}
      </main>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-[color:var(--paper)]">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-none border border-[color:var(--ink)] bg-[color:var(--paper)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink)] transition-transform duration-200 focus:translate-y-0 focus:outline-none"
      >
        Skip to content
      </a>
      {sidebar}
      <main
        id="main-content"
        className="relative flex-1 overflow-y-auto border-l border-[color:var(--paper-rule)]"
      >
        {children}
      </main>
    </div>
  );
}
