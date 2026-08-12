/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useMutation, useQuery } from '@/lib/supabase/client';
import { api } from '@/lib/supabase/api';
import { PremiumButton, FieldLabel, fieldClassName } from '@/components/ui/Premium';
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  readLearnQuizPasses,
  setLearnQuizPasses,
  type LearnQuizPasses,
} from '@/lib/bookTrainingPreferences';

export function SettingsForm() {
  const user = useQuery(api.users.current);
  const updateAccounts = useMutation(api.users.updateAccounts);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lichess, setLichess] = useState('');
  const [chesscom, setChesscom] = useState('');
  const [learnQuizPasses, setLearnQuizPassesState] = useState<LearnQuizPasses>(1);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLearnQuizPassesState(readLearnQuizPasses());
    });
    const onPasses = () => setLearnQuizPassesState(readLearnQuizPasses());
    window.addEventListener('repdrill:learn-quiz-passes', onPasses);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('repdrill:learn-quiz-passes', onPasses);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    setLichess(user.lichessUsername ?? '');
    setChesscom(user.chesscomUsername ?? '');
  }, [user]);

  const isDirty = useMemo(
    () => lichess !== (user?.lichessUsername ?? '') || chesscom !== (user?.chesscomUsername ?? ''),
    [lichess, chesscom, user?.lichessUsername, user?.chesscomUsername],
  );

  if (user === undefined) return <div>Loading...</div>;
  if (user === null) return <div>Not logged in</div>;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    
    await updateAccounts({
      lichessUsername: lichess || null,
      chesscomUsername: chesscom || null,
    });
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FieldLabel label="Lichess username" hint="public games — no auth needed">
        <input
          name="lichess"
          value={lichess}
          onChange={(e) => setLichess(e.target.value)}
          placeholder="e.g. DrNykterstein"
          className={fieldClassName}
          autoComplete="off"
        />
      </FieldLabel>
      <FieldLabel label="Chess.com username" hint="public games — no auth needed">
        <input
          name="chesscom"
          value={chesscom}
          onChange={(e) => setChesscom(e.target.value)}
          placeholder="e.g. magnuscarlsen"
          className={fieldClassName}
          autoComplete="off"
        />
      </FieldLabel>

      <div className="border-t border-[color:var(--paper-rule)] pt-6">
        <FieldLabel
          label="Quiz passes after overview"
          hint="Learn mode shows the line once, then repeats the moves"
        >
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Quiz passes after overview">
            {([1, 2, 3] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={learnQuizPasses === value}
                onClick={() => {
                  setLearnQuizPassesState(value);
                  setLearnQuizPasses(value);
                }}
                className={`min-h-11 rounded-lg border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                  learnQuizPasses === value
                    ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]'
                    : 'border-[color:var(--paper-rule)] bg-[color:var(--surface)] text-[color:var(--ink-soft)] hover:border-[color:var(--library-green)] hover:text-[color:var(--ink)]'
                }`}
              >
                {value} {value === 1 ? 'pass' : 'passes'}
              </button>
            ))}
          </div>
        </FieldLabel>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <PremiumButton type="submit" disabled={isSaving || !isDirty}>
          {isSaving ? "Saving..." : isDirty ? "Save" : "Saved"}
        </PremiumButton>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          {saved ? 'Saved' : isDirty ? 'Unsaved changes' : 'No changes'}
        </p>
      </div>
    </form>
  );
}
