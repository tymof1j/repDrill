'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { updateLanguageAction } from '@/app/settings/actions';
import type { Language } from '@/lib/i18n/translations';

export const navItems = [
  { href: '/courses', label: 'Courses', shortcut: 'C', subtitle: 'Theory' },
  { href: '/repertoires', label: 'Repertoires', shortcut: 'R', subtitle: 'Merged prep' },
  { href: '/train', label: 'Train', shortcut: 'T', subtitle: 'FSRS recall' },
  { href: '/analyze', label: 'Analyze', shortcut: 'A', subtitle: 'Game review' },
];

const navCopy = {
  en: {
    items: navItems,
  },
  uk: {
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
                  <span className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">
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

// ─── Mobile burger menu ───────────────────────────────────────────────────────

interface MobileNavProps {
  language?: string;
  email?: string | null;
  lichessUsername?: string | null;
  chesscomUsername?: string | null;
  signOutAction?: () => Promise<void>;
}

export function MobileNav({
  language = 'en',
  email,
  lichessUsername,
  chesscomUsername,
  signOutAction,
}: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const lang = normalizeLanguage(language);
  const items = navCopy[lang].items;

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open]);

  const close = () => setOpen(false);

  const BurgerIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );

  const CloseIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="M6 6l12 12" />
    </svg>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[color:var(--paper-rule)] bg-[color:var(--paper)]/90 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
        <Link
          href="/courses"
          onClick={close}
          className="font-display text-base font-semibold tracking-[-0.03em] text-[color:var(--ink)]"
        >
          RepDrill
        </Link>
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="grid h-9 w-9 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-soft)] transition-colors duration-200 hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]"
        >
          {open ? <CloseIcon /> : <BurgerIcon />}
        </button>
      </div>
    </header>

    {/* Backdrop */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 top-14 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer — slides in from right */}
      <div
        className={`fixed inset-y-0 right-0 top-14 z-50 w-full max-w-[22rem] overflow-y-auto border-l border-[color:var(--paper-rule)] bg-[color:var(--paper)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="space-y-0 divide-y divide-[color:var(--paper-rule)]">

          {/* User */}
          {email && (
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--ink)] text-[12px] font-bold text-[color:var(--paper)]">
                {email[0].toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-[color:var(--ink)]">{email}</span>
                {(lichessUsername || chesscomUsername) && (
                  <span className="mt-0.5 block font-mono text-[10px] text-[color:var(--ink-faint)]">
                    {lichessUsername ? `Lichess · ${lichessUsername}` : `Chess.com · ${chesscomUsername}`}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Nav */}
          <nav className="px-3 py-4">
            <p className="mb-2 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Workspace
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      className={`flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 ${
                        active
                          ? 'bg-[color:var(--surface-soft)] text-[color:var(--ink)]'
                          : 'text-[color:var(--ink-soft)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]'
                      }`}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-[11px] font-semibold ${
                        active
                          ? 'border-[color:var(--library-green)] bg-[color:var(--library-green)] text-white'
                          : 'border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-faint)]'
                      }`}>
                        {item.shortcut}
                      </span>
                      <span>
                        <span className="block text-[14px] font-semibold leading-tight">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-[color:var(--ink-faint)]">{item.subtitle}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Help */}
          <div className="px-3 py-4">
            <p className="mb-2 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Help
            </p>
            <Link
              href="/documentation"
              onClick={close}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-[14px] text-[color:var(--ink-soft)] transition-colors duration-150 hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-faint)]">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
                  <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
                </svg>
              </span>
              FAQ
            </Link>
          </div>

          {/* Preferences */}
          <div className="px-5 py-4 space-y-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Preferences
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[color:var(--ink-soft)]">Language</span>
              <LanguageToggle
                initialLanguage={lang}
                onPersist={async (l: Language) => { await updateLanguageAction(l); }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[color:var(--ink-soft)]">Theme</span>
              <ThemeToggle variant="mobile" />
            </div>
          </div>

          {/* Settings links */}
          <div className="px-3 py-4">
            <p className="mb-2 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Account
            </p>
            <Link
              href="/settings"
              onClick={close}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-[14px] text-[color:var(--ink-soft)] transition-colors duration-150 hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-faint)]">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </span>
              Usernames &amp; data export
            </Link>
            {signOutAction && (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[14px] text-[color:var(--ink-faint)] transition-colors duration-150 hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--margin-red)]"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-faint)]">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </span>
                  Sign out
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
