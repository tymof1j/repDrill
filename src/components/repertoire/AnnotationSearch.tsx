'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { SecondaryButton, fieldClassName } from '@/components/ui/Premium';

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

  const annotated = useMemo(
    () => positions.filter((p) => p.annotation),
    [positions],
  );

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
        className="px-4 py-2 text-xs"
      >
        Search annotations (/)
      </SecondaryButton>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search annotations..."
          className={`${fieldClassName} py-2`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setQuery('');
            }
          }}
        />
        {!alwaysOpen && (
          <SecondaryButton
            onClick={() => {
              setOpen(false);
              setQuery('');
            }}
            className="px-4 py-2 text-xs"
          >
            Close
          </SecondaryButton>
        )}
      </div>

      {results.length > 0 && (
        <ul className="max-h-64 overflow-y-auto rounded-xl border border-[#263337] bg-[#172225]">
          {results.map((r) => (
            <li key={r.item.id}>
              <button
                onClick={() => {
                  onSelect(r.item.id);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full flex-col gap-1 border-b border-[#263337] px-4 py-3 text-left text-sm text-[#dfe8e4] transition-colors duration-200 last:border-b-0 hover:bg-[#223034] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70"
              >
                <span className="font-mono text-xs text-[#8fa3a0]">
                  {r.item.fen.split(' ').slice(0, 2).join(' ')}
                </span>
                <span className="line-clamp-2">{r.item.annotation}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim() && results.length === 0 && (
        <p className="text-sm text-[#9fb0aa]">No matching annotations.</p>
      )}
    </div>
  );
}
