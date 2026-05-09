'use client';

import { useRef, useState } from 'react';
import {
  PremiumPanel,
  PremiumButton,
  SecondaryButton,
  GhostButton,
} from '@/components/ui/Premium';

export function DataPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (file: File) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const text = await file.text();
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Import failed (${res.status})`);
      }
      const summary = await res.json();
      setMessage(
        `Imported ${summary.coursesCreated} courses, ${summary.movesCreated} moves, ${summary.cardsCreated} review cards.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PremiumPanel className="max-w-2xl" innerClassName="px-6 py-7 md:px-8 md:py-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        Data · § appendix
      </p>
      <h2 className="mt-3 font-display text-2xl font-medium leading-tight text-[color:var(--ink)]">
        Take it with you.
      </h2>
      <p className="mt-3 max-w-xl font-display-italic text-[14px] text-[color:var(--ink-soft)]">
        Everything you import or train on stays yours. Download the full archive — courses,
        moves, FSRS state, review history — and restore it anywhere.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <PremiumButton href="/api/export/bundle">Export everything (JSON)</PremiumButton>
        <SecondaryButton href="/api/export/review-logs">Review logs (CSV)</SecondaryButton>
      </div>

      <div className="mt-8 border-t border-[color:var(--paper-edge)] pt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Import bundle
        </p>
        <p className="mt-2 max-w-xl font-display-italic text-[13px] text-[color:var(--ink-soft)]">
          Restore from a previously exported <code className="font-mono">.json</code>. Existing
          positions are deduplicated by FEN.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
              e.target.value = '';
            }}
          />
          <SecondaryButton onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Importing…' : 'Choose .json'}
          </SecondaryButton>
          {message && (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--library-green)]">
              {message}
            </span>
          )}
          {error && (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--margin-red)]">
              {error}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-[color:var(--paper-edge)] pt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Per-course PGN
        </p>
        <p className="mt-2 max-w-xl font-display-italic text-[13px] text-[color:var(--ink-soft)]">
          To download a single course as standard PGN, open it in the library — the export
          link lives in the course actions.
        </p>
        <div className="mt-2">
          <GhostButton onClick={() => (window.location.href = '/courses')}>
            Open library →
          </GhostButton>
        </div>
      </div>
    </PremiumPanel>
  );
}
