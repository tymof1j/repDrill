'use client';

import { useEffect, useState } from 'react';

type Theme = 'morning' | 'evening';

const STORAGE_KEY = 'repdrill-theme';
const subscribers = new Set<(t: Theme) => void>();

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'morning';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'morning' || stored === 'evening') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'evening' : 'morning';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'evening') {
    root.setAttribute('data-theme', 'evening');
  } else {
    root.removeAttribute('data-theme');
  }
}

function setGlobalTheme(theme: Theme) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage may be unavailable; ignore.
  }
  subscribers.forEach((fn) => fn(theme));
}

export function ThemeToggle({ variant = 'sidebar' }: { variant?: 'sidebar' | 'mobile' }) {
  const [theme, setTheme] = useState<Theme>('morning');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readStoredTheme();
    applyTheme(initial);
    const frame = window.requestAnimationFrame(() => {
      setTheme(initial);
      setMounted(true);
    });

    const onChange = (next: Theme) => setTheme(next);
    subscribers.add(onChange);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'morning' || e.newValue === 'evening')) {
        applyTheme(e.newValue);
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.cancelAnimationFrame(frame);
      subscribers.delete(onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'evening' ? 'morning' : 'evening';
    setGlobalTheme(next);
  };

  const isDark = mounted && theme === 'evening';
  const label = isDark ? 'Switch to day' : 'Switch to night';

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-soft)] transition-colors duration-200 hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
      >
        <ThemeGlyph dark={isDark} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      className="mt-2 flex w-full items-center justify-between gap-3 rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-3 py-2.5 text-left transition-colors duration-200 hover:bg-[color:var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
    >
      <span className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-soft)]">
          <ThemeGlyph dark={isDark} />
        </span>
        <span className="flex flex-col">
          <span className="text-[13px] font-semibold leading-tight text-[color:var(--ink)]">
            {isDark ? 'Evening' : 'Morning'}
          </span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Theme
          </span>
        </span>
      </span>
      <span
        aria-hidden
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-[color:var(--paper-rule)] transition-colors duration-200 ${
          isDark ? 'bg-[color:var(--ink)]' : 'bg-[color:var(--paper-deep)]'
        }`}
      >
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[color:var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.18)] transition-transform duration-200 ${
            isDark ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </span>
    </button>
  );
}

function ThemeGlyph({ dark }: { dark: boolean }) {
  if (dark) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20.5 14.5A8 8 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
