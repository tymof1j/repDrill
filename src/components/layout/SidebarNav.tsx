'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const navItems = [
  { href: '/courses', label: 'Courses', numeral: 'I', subtitle: 'Theory bodies' },
  { href: '/repertoires', label: 'Repertoires', numeral: 'II', subtitle: 'Merged preparation' },
  { href: '/train', label: 'Train', numeral: 'III', subtitle: 'FSRS recall' },
  { href: '/analyze', label: 'Analyze', numeral: 'IV', subtitle: 'Game review' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-baseline gap-4 py-2.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)] ${
                  active ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]'
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute -left-7 top-1/2 hidden h-px w-3 -translate-y-1/2 transition-all duration-200 md:block ${
                    active ? 'bg-[color:var(--margin-red)] w-5' : 'bg-transparent group-hover:bg-[color:var(--paper-edge)]'
                  }`}
                />
                <span
                  className={`w-7 shrink-0 font-display text-[15px] italic tracking-normal ${
                    active ? 'text-[color:var(--margin-red)]' : 'text-[color:var(--ink-faint)]'
                  }`}
                  style={{ fontFeatureSettings: '"onum"' }}
                >
                  {item.numeral}.
                </span>
                <span className="flex flex-col">
                  <span
                    className={`font-display text-[1.35rem] font-medium leading-tight ${
                      active ? 'italic text-[color:var(--ink)]' : ''
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                    {item.subtitle}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[color:var(--paper-edge)] bg-[color:var(--paper)]/95 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <Link
          href="/courses"
          className="shrink-0 font-display text-base font-medium tracking-tight text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
        >
          RepDrill
        </Link>
        <span aria-hidden className="h-3 w-px bg-[color:var(--paper-edge)]" />
        <nav className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex min-w-max gap-0">
            {navItems.map((item, idx) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="flex items-center">
                  {idx > 0 && (
                    <span aria-hidden className="px-2 font-display italic text-[color:var(--ink-ghost)]">
                      ·
                    </span>
                  )}
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-9 items-center gap-1.5 px-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)] ${
                      active
                        ? 'text-[color:var(--margin-red)]'
                        : 'text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]'
                    }`}
                  >
                    <span
                      className="font-display text-[11px] italic"
                      style={{ fontFeatureSettings: '"onum"' }}
                    >
                      {item.numeral}.
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
