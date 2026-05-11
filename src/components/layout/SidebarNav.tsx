'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';

export const navItems = [
  { href: '/courses', label: 'Courses', shortcut: 'C', subtitle: 'Theory' },
  { href: '/repertoires', label: 'Repertoires', shortcut: 'R', subtitle: 'Merged prep' },
  { href: '/train', label: 'Train', shortcut: 'T', subtitle: 'FSRS recall' },
  { href: '/analyze', label: 'Analyze', shortcut: 'A', subtitle: 'Game review' },
];

const navCopy = {
  en: {
    brandSubtitle: 'Opening memory',
    items: navItems,
  },
  uk: {
    brandSubtitle: 'Памʼять дебютів',
    items: [
      { href: '/courses', label: 'Курси', shortcut: 'C', subtitle: 'Теорія' },
      { href: '/repertoires', label: 'Репертуари', shortcut: 'R', subtitle: 'Підготовка' },
      { href: '/train', label: 'Тренування', shortcut: 'T', subtitle: 'FSRS' },
      { href: '/analyze', label: 'Аналіз', shortcut: 'A', subtitle: 'Партії' },
    ],
  },
};

export type SupportedLanguage = keyof typeof navCopy;

export function normalizeLanguage(language: string | null | undefined): SupportedLanguage {
  return language === 'uk' ? 'uk' : 'en';
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ language = 'en' }: { language?: string }) {
  const pathname = usePathname();
  const items = navCopy[normalizeLanguage(language)].items;

  return (
    <nav className="flex-1">
      <ul className="space-y-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] ${
                  active
                    ? 'bg-[color:var(--paper)] text-[color:var(--ink)] shadow-[0_10px_28px_rgba(47,58,50,0.06)]'
                    : 'text-[color:var(--ink-soft)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]'
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border text-[11px] font-semibold ${
                    active
                      ? 'border-[color:var(--library-green)] bg-[color:var(--library-green)] text-white'
                      : 'border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-faint)]'
                  }`}
                >
                  {item.shortcut}
                </span>
                <span className="flex flex-col">
                  <span
                    className="text-[15px] font-semibold leading-tight tracking-[-0.01em]"
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 text-xs text-[color:var(--ink-faint)]">
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

export function MobileNav({ language = 'en' }: { language?: string }) {
  const pathname = usePathname();
  const copy = navCopy[normalizeLanguage(language)];

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[color:var(--paper-rule)] bg-[color:var(--paper)]/90 px-4 py-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto">
        <Link
          href="/courses"
          className="shrink-0 rounded-md font-display text-base font-semibold tracking-[-0.03em] text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
        >
          RepDrill
        </Link>
        <span aria-hidden className="h-3 w-px bg-[color:var(--paper-rule)]" />
        <nav className="min-w-0 flex-1 overflow-x-auto" aria-label="Primary">
          <ul className="flex min-w-max gap-0">
            {copy.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="flex items-center">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`ml-2 flex min-h-9 items-center rounded-md px-3 text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] ${
                      active
                        ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
                        : 'text-[color:var(--ink-soft)] hover:bg-[color:var(--surface)] hover:text-[color:var(--ink)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Link
          href="/documentation"
          className="flex min-h-9 shrink-0 items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3 text-[12px] font-semibold text-[color:var(--ink-soft)] transition-colors duration-200 hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
        >
          FAQ
        </Link>
        <LanguageToggle />
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-soft)] transition-colors duration-200 hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </Link>
        <ThemeToggle variant="mobile" />
      </div>
    </header>
  );
}
