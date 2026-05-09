'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { GhostButton, SecondaryButton, fieldClassName } from '@/components/ui/Premium';

export type SearchablePosition = {
  id: string;
  fen: string;
  annotation: string | null;
};

type Props = {
  positions: SearchablePosition[];
  onSelect: (positionId: string) => void;
  alwaysOpen?: boolean;
};

export function AnnotationSearch({ positions, onSelect, alwaysOpen = false }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(alwaysOpen);
  const inputRef = useRef<HTMLInputElement>(null);

  const annotated = useMemo(() => positions.filter((p) => p.annotation), [positions]);

  const fuse = useMemo(
    () =>
      new Fuse(annotated, {
        keys: ['annotation'],
        threshold: 0.4,
        includeMatches: true,
      }),
    [annotated],
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 10);
  }, [fuse, query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') {
        setOpen(alwaysOpen);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [alwaysOpen]);

  if (!open && !alwaysOpen) {
    return (
      <SecondaryButton
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        Search annotations <span className="opacity-60">(/)</span>
      </SecondaryButton>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3 border-b border-[color:var(--paper-edge)] pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          /
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a phrase in any annotation…"
          className="font-display flex-1 bg-transparent text-lg italic text-[color:var(--ink)] placeholder:text-[color:var(--ink-ghost)] focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setQuery('');
            }
          }}
        />
        {!alwaysOpen && (
          <GhostButton
            onClick={() => {
              setOpen(false);
              setQuery('');
            }}
          >
            Close
          </GhostButton>
        )}
      </div>

      {results.length > 0 && (
        <ul className="max-h-72 divide-y divide-[color:var(--paper-rule)] overflow-y-auto border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)]">
          {results.map((r) => (
            <li key={r.item.id}>
              <button
                onClick={() => {
                  onSelect(r.item.id);
                  setOpen(false);
                  setQuery('');
                }}
                className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left transition-colors duration-200 hover:bg-[color:var(--paper-deep)] focus-visible:outline-none focus-visible:bg-[color:var(--paper-deep)]"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                  {r.item.fen.split(' ').slice(0, 2).join(' ')}
                </span>
                <span className="line-clamp-2 font-display-italic text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
                  {r.item.annotation}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim() && results.length === 0 && (
        <p className="font-display-italic text-[14px] text-[color:var(--ink-soft)]">
          No matching annotations.
        </p>
      )}
    </div>
  );
}
