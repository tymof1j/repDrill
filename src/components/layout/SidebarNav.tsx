'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const navItems = [
  { href: '/courses', label: 'Courses', mark: 'C' },
  { href: '/repertoires', label: 'Repertoires', mark: 'R' },
  { href: '/train', label: 'Train', mark: 'T' },
  { href: '/analyze', label: 'Analyze', mark: 'A' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-2">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10191b] active:scale-[0.98] ${
                  active
                    ? 'bg-[#7dd3c7]/[0.14] text-[#f4faf7] shadow-[inset_3px_0_0_#7dd3c7]'
                    : 'text-[#9fb0aa] hover:bg-[#223034] hover:text-[#f4faf7]'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold transition-colors duration-200 ${
                    active
                      ? 'bg-[#7dd3c7] text-[#071314]'
                      : 'bg-[#223034] text-[#a8e7df] group-hover:bg-[#2a3b40]'
                  }`}
                >
                  {item.mark}
                </span>
                {item.label}
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
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#263337] bg-[#0b1214]/95 px-3 py-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <Link
          href="/courses"
          className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f4faf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70"
        >
          RepDrill
        </Link>
        <nav className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex min-w-max gap-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70 ${
                      active
                        ? 'bg-[#7dd3c7] text-[#071314]'
                        : 'bg-[#172225] text-[#dfe8e4] hover:bg-[#223034] hover:text-[#f4faf7]'
                    }`}
                  >
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
