'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LANGUAGE_STORAGE_KEY,
  type Language,
  normalizeLanguage,
  ukTranslations,
} from '@/lib/i18n/translations';

const SKIP_SELECTOR =
  'script,style,code,kbd,pre,input,textarea,select,option,.notation,cg-board,.cg-wrap,[data-no-translate]';
const ATTR_SKIP_SELECTOR =
  'script,style,code,kbd,pre,.notation,cg-board,.cg-wrap,[data-no-translate]';

function preserveOuterWhitespace(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? '';
  const trailing = original.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

function translateText(original: string, language: Language) {
  if (language === 'en') return original;
  const trimmed = original.trim().replace(/\s+/g, ' ');
  if (!trimmed) return original;
  const translated = ukTranslations[trimmed];
  return translated ? preserveOuterWhitespace(original, translated) : original;
}

function shouldSkip(node: Node) {
  const parent = node.parentElement;
  return !parent || parent.closest(SKIP_SELECTOR) !== null;
}

function applyLanguage(language: Language, originals: WeakMap<Text, string>) {
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode() as Text | null;
  while (node) {
    const original = originals.get(node) ?? node.nodeValue ?? '';
    if (!originals.has(node)) originals.set(node, original);
    const nextText = translateText(original, language);
    if (node.nodeValue !== nextText) node.nodeValue = nextText;
    node = walker.nextNode() as Text | null;
  }

  document.querySelectorAll<HTMLElement>('[placeholder],[aria-label],[title]').forEach((element) => {
    if (element.closest(ATTR_SKIP_SELECTOR)) return;
    for (const attr of ['placeholder', 'aria-label', 'title']) {
      const value = element.getAttribute(attr);
      if (!value) continue;
      const originalAttr = `data-i18n-original-${attr}`;
      const original = element.getAttribute(originalAttr) ?? value;
      if (!element.hasAttribute(originalAttr)) element.setAttribute(originalAttr, original);
      const nextValue = translateText(original, language);
      if (element.getAttribute(attr) !== nextValue) element.setAttribute(attr, nextValue);
    }
  });
}

function persistLanguage(language: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.cookie = `${LANGUAGE_STORAGE_KEY}=${language}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Storage can be blocked. The in-memory state still updates the UI.
  }
}

declare global {
  interface Window {
    setRepDrillLanguage?: (language: Language) => void;
  }
}

export function I18nProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: React.ReactNode;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const originals = useRef(new WeakMap<Text, string>());

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
      setLanguage((current) => (stored !== current ? stored : current));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let frame = 0;
    let secondFrame = 0;
    let timer = 0;

    const scheduleApply = (delay = 0) => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(secondFrame);
      timer = window.setTimeout(() => {
        frame = window.requestAnimationFrame(() => {
          secondFrame = window.requestAnimationFrame(() => applyLanguage(language, originals.current));
        });
      }, delay);
    };

    // Language controls should feel like a native toggle: update the current
    // DOM before waiting for React's next render. The delayed scheduler remains
    // for content mounted later by client navigation.
    applyLanguage(language, originals.current);
    persistLanguage(language);

    const applyNextLanguage = (next: Language) => {
      const normalized = normalizeLanguage(next);
      applyLanguage(normalized, originals.current);
      persistLanguage(normalized);
      setLanguage(normalized);
    };

    window.setRepDrillLanguage = applyNextLanguage;
    const onLanguage = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: string }>).detail;
      applyNextLanguage(normalizeLanguage(detail?.language));
    };
    window.addEventListener('repdrill-language', onLanguage);

    const observer = new MutationObserver(() => {
      scheduleApply(120);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(secondFrame);
      window.removeEventListener('repdrill-language', onLanguage);
      if (window.setRepDrillLanguage === applyNextLanguage) {
        delete window.setRepDrillLanguage;
      }
    };
  }, [language]);

  return children;
}
