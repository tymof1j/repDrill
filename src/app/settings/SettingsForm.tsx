'use client';

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PremiumButton, FieldLabel, fieldClassName } from '@/components/ui/Premium';
import { FormEvent, useEffect, useMemo, useState } from "react";

export function SettingsForm() {
  const user = useQuery(api.users.current);
  const updateAccounts = useMutation(api.users.updateAccounts);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lichess, setLichess] = useState('');
  const [chesscom, setChesscom] = useState('');

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
