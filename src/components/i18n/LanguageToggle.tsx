'use client';

import { useEffect, useState } from 'react';
import { LANGUAGE_STORAGE_KEY, type Language, normalizeLanguage } from '@/lib/i18n/translations';

export function LanguageToggle({ initialLanguage = 'en' }: { initialLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLanguage(normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)));
    });
    const onLanguage = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: string }>).detail;
      setLanguage(normalizeLanguage(detail?.language));
    };
    window.addEventListener('repdrill-language', onLanguage);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('repdrill-language', onLanguage);
    };
  }, []);

  const nextLanguage: Language = language === 'uk' ? 'en' : 'uk';
  const label = language === 'uk' ? 'Switch to English' : 'Перемкнути українською';

  const toggle = () => {
    setLanguage(nextLanguage);
    window.setRepDrillLanguage?.(nextLanguage);
    window.dispatchEvent(
      new CustomEvent('repdrill-language', { detail: { language: nextLanguage } }),
    );
  };

  return (
    <button
      data-no-translate
      type="button"
      aria-label={label}
      title={label}
      onClick={toggle}
      className="inline-flex h-10 min-w-12 items-center justify-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--ink-soft)] transition-colors duration-200 hover:border-[color:var(--library-green)] hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
    >
      {language === 'uk' ? 'UK' : 'EN'}
    </button>
  );
}
