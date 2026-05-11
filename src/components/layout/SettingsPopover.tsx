'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateLanguageAction } from '@/app/settings/actions';

interface SettingsPopoverProps {
  email: string | null;
  language: string;
  signOutAction: () => Promise<void>;
}

const copy = {
  en: {
    settings: 'Settings',
    language: 'Language',
    saving: 'Saving',
    saved: 'Saved',
    data: 'Data & export',
    signOut: 'Sign out',
  },
  uk: {
    settings: 'Settings',
    language: 'Мова',
    saving: 'Збереження',
    saved: 'Збережено',
    data: 'Дані та експорт',
    signOut: 'Вийти',
  },
};

function normalizeLanguage(value: string): 'en' | 'uk' {
  return value === 'uk' ? 'uk' : 'en';
}

export function SettingsPopover({
  email,
  language,
  signOutAction,
}: SettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [optimisticLanguage, setOptimisticLanguage] = useState<'en' | 'uk' | null>(null);
  const selectedLanguage = optimisticLanguage ?? normalizeLanguage(language);
  const text = copy[selectedLanguage];

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  const handleLanguageChange = (nextLanguage: string) => {
    const normalized = normalizeLanguage(nextLanguage);
    setOptimisticLanguage(normalized);
    setSaved(false);
    window.setRepDrillLanguage?.(normalized);
    window.dispatchEvent(new CustomEvent('repdrill-language', { detail: { language: normalized } }));
    startTransition(async () => {
      await updateLanguageAction(normalized);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] ${
          open
            ? 'bg-[color:var(--paper)] text-[color:var(--ink)] shadow-[0_10px_28px_rgba(47,58,50,0.06)]'
            : 'text-[color:var(--ink-soft)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]'
        }`}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border text-[11px] font-semibold ${
            open
              ? 'border-[color:var(--library-green)] bg-[color:var(--library-green)] text-white'
              : 'border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-faint)]'
          }`}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </span>
          <span className="flex flex-col">
          <span className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">
            {text.settings}
          </span>
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Settings"
          className="absolute bottom-0 left-full z-50 ml-3 w-80 animate-in fade-in slide-in-from-left-2 rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] shadow-[0_24px_70px_rgba(47,58,50,0.18)]"
        >
          <div className="max-h-[80vh] overflow-y-auto p-5">
            {email && (
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--ink)] text-[11px] font-bold text-[color:var(--paper)]">
                  {email[0].toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-[color:var(--ink)]">
                    {email}
                  </span>
                </span>
              </div>
            )}

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 flex items-baseline justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  {text.language}
                  <span className="tracking-[0.14em] text-[color:var(--library-green)]">
                    {isPending ? text.saving : saved ? text.saved : ''}
                  </span>
                </span>
                <select
                  name="language"
                  value={selectedLanguage}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--paper)] px-3 py-2 text-[13px] text-[color:var(--ink)] outline-none transition-colors duration-200 focus:border-[color:var(--library-green)] focus:ring-1 focus:ring-[color:var(--library-green)]/20 disabled:opacity-70"
                >
                  <option value="en">English</option>
                  <option value="uk">Українська</option>
                </select>
              </label>
            </div>

            <div className="mt-4 border-t border-[color:var(--paper-rule)] pt-3">
              <a
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[color:var(--ink-soft)] transition-colors duration-200 hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {text.data}
              </a>
            </div>

            {email && (
              <div className="mt-2 border-t border-[color:var(--paper-rule)] pt-3">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-md px-2 py-1.5 text-left text-[12px] text-[color:var(--ink-faint)] transition-colors duration-200 hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--margin-red)]"
                  >
                    {text.signOut}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
