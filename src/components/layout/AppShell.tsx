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
  const isPublicPage = pathname === '/' || pathname === '/login';

  if (isPublicPage) {
    return <main id="main-content" className="min-h-screen">{children}</main>;
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#0b1214]">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-lg bg-[#7dd3c7] px-4 py-2 text-sm font-semibold text-[#071314] transition-transform duration-200 focus:translate-y-0 focus:outline-none"
      >
        Skip to content
      </a>
      <div className="pointer-events-none fixed inset-0 z-10 opacity-[0.02] [background-image:radial-gradient(#fff_0.8px,transparent_0.8px)] [background-size:12px_12px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(125,211,199,0.06),transparent_34%,rgba(91,141,151,0.06)_72%,transparent)]" />
      {sidebar}
      <main id="main-content" className="relative z-20 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
