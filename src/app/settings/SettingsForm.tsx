'use client';

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PremiumButton, FieldLabel, fieldClassName } from '@/components/ui/Premium';
import { FormEvent, useState } from "react";

export function SettingsForm() {
  const user = useQuery(api.users.current);
  const updateAccounts = useMutation(api.users.updateAccounts);
  const [isSaving, setIsSaving] = useState(false);

  if (user === undefined) return <div>Loading...</div>;
  if (user === null) return <div>Not logged in</div>;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const lichess = formData.get('lichess') as string;
    const chesscom = formData.get('chesscom') as string;
    
    await updateAccounts({
      lichessUsername: lichess || null,
      chesscomUsername: chesscom || null,
    });
    setIsSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FieldLabel label="Lichess username" hint="public games — no auth needed">
        <input
          name="lichess"
          defaultValue={user?.lichessUsername ?? ''}
          placeholder="e.g. DrNykterstein"
          className={fieldClassName}
          autoComplete="off"
        />
      </FieldLabel>
      <FieldLabel label="Chess.com username" hint="public games — no auth needed">
        <input
          name="chesscom"
          defaultValue={user?.chesscomUsername ?? ''}
          placeholder="e.g. magnuscarlsen"
          className={fieldClassName}
          autoComplete="off"
        />
      </FieldLabel>

      <div className="flex items-center gap-3 pt-2">
        <PremiumButton type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </PremiumButton>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          Saves accounts
        </p>
      </div>
    </form>
  );
}
