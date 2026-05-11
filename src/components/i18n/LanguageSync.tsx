'use client';

import { useEffect } from 'react';
import { type Language } from '@/lib/i18n/translations';

export function LanguageSync({ language }: { language: Language }) {
  useEffect(() => {
    window.setRepDrillLanguage?.(language);
    window.dispatchEvent(new CustomEvent('repdrill-language', { detail: { language } }));
  }, [language]);

  return null;
}
