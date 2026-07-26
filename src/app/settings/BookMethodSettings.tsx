'use client';

import { useEffect, useState } from 'react';
import {
  BOOK_METHODS,
  isBookMethodEnabled,
  setBookMethodEnabled,
  type BookTrainingKey,
} from '@/lib/bookTrainingPreferences';

const books = Object.keys(BOOK_METHODS) as BookTrainingKey[];

export function BookMethodSettings() {
  const [enabled, setEnabled] = useState<Record<BookTrainingKey, boolean>>({
    'woodpecker-method': true,
    'woodpecker-method-2': true,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setEnabled({
        'woodpecker-method': isBookMethodEnabled('woodpecker-method'),
        'woodpecker-method-2': isBookMethodEnabled('woodpecker-method-2'),
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggle = (book: BookTrainingKey) => {
    const next = !enabled[book];
    setBookMethodEnabled(book, next);
    setEnabled((current) => ({ ...current, [book]: next }));
  };

  return (
    <div className="divide-y divide-[color:var(--paper-rule)]">
      {books.map((book) => {
        const method = BOOK_METHODS[book];
        const active = enabled[book];
        return (
          <div
            key={book}
            className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="max-w-xl">
              <h3 className="text-[16px] font-semibold text-[color:var(--ink)]">
                Follow the author’s method · {method.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                {method.kind === 'tactical'
                  ? 'Ordered solving, a 250-position starter set, seven faster cycles, pace tracking, and full-line calculation.'
                  : 'Ordered solving, a 296-position starter set, seven faster cycles, pace tracking, and deeper solution review in the first two cycles.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => toggle(book)}
              className={`inline-flex min-w-28 items-center justify-between gap-3 rounded-full border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                active
                  ? 'border-[color:var(--library-green)] bg-[color:var(--library-green)] text-white'
                  : 'border-[color:var(--paper-edge)] bg-[color:var(--surface)] text-[color:var(--ink-soft)]'
              }`}
            >
              {active ? 'Following' : 'Free mode'}
              <span
                aria-hidden
                className={`h-3.5 w-3.5 rounded-full border ${
                  active ? 'border-white bg-white' : 'border-current bg-transparent'
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
