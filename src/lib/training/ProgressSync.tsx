'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { ProgressOutbox, type SyncState } from './outbox';
import type { ProgressEvent } from './progress';
import { invalidateQueries } from '@/lib/supabase/client';

const Context = createContext<ProgressOutbox | null>(null);
const empty: SyncState = { pending: 0, syncing: false, error: null, durable: true };
const emptySubscribe = () => () => {};
const getEmpty = () => empty;

export function ProgressSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const outbox = useMemo(() => {
    if (!userId || typeof window === 'undefined') return null;
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* Show memory-only status. */ }
    return new ProgressOutbox(userId, storage, async (events) => {
      const response = await fetch('/api/backend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'training.syncProgress', args: { events }, expectedUserId: userId }),
        signal: AbortSignal.timeout(20_000),
        keepalive: true,
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      const payload = await response.json();
      invalidateQueries(['training.']);
      return payload.value;
    });
  }, [userId]);

  useEffect(() => {
    if (!outbox) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 500;
    let stopped = false;
    const schedule = () => {
      if (timer || stopped || outbox.getSnapshot().syncing || !outbox.getSnapshot().pending) return;
      timer = setTimeout(async () => {
        timer = undefined;
        await outbox.flush();
        delay = outbox.getSnapshot().error ? Math.min(delay * 2, 30_000) : 500;
        schedule();
      }, delay);
    };
    const retry = () => { delay = 500; outbox.refresh(); void outbox.flush(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') void outbox.flush(); else retry(); };
    const unsubscribe = outbox.subscribe(schedule);
    window.addEventListener('online', retry);
    window.addEventListener('storage', retry);
    window.addEventListener('pagehide', retry);
    document.addEventListener('visibilitychange', onVisibility);
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('online', retry);
      window.removeEventListener('storage', retry);
      window.removeEventListener('pagehide', retry);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [outbox]);

  return <Context.Provider value={outbox}>{children}</Context.Provider>;
}

export function useProgressSync() {
  const outbox = useContext(Context);
  const state = useSyncExternalStore(outbox?.subscribe ?? emptySubscribe, outbox?.getSnapshot ?? getEmpty, getEmpty);
  const enqueue = useCallback((event: ProgressEvent) => {
    if (!outbox) throw new Error('Your session is not ready to save progress');
    outbox.enqueue(event);
  }, [outbox]);
  return { ...state, enqueue, retry: () => outbox?.flush() };
}

export function ProgressSyncStatus() {
  const sync = useProgressSync();
  if (!sync.pending) return null;
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[color:var(--ink-soft)]">
      <span>{!sync.durable
        ? 'Browser storage is unavailable. Keep this tab open until progress syncs.'
        : sync.error ? 'Saved on this device. Waiting to sync.' : 'Saving progress in the background…'}</span>
      {sync.error && <button type="button" className="underline" onClick={() => void sync.retry()}>Retry now</button>}
    </div>
  );
}
