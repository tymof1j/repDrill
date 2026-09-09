/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import type { BackendResult } from './types';

type QueryState = { value: any; error: Error | null; loading: boolean };
type Entry = { state: QueryState; listeners: Set<() => void>; request?: Promise<void>; stale: boolean; version: number; ref: string };
const empty: QueryState = { value: undefined, error: null, loading: false };
const cache = new Map<string, Entry>();
const MAX_CACHE_ENTRIES = 150;

export async function callBackend(operation: string, args: unknown, expectedUserId?: string) {
  const response = await fetch('/api/backend', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operation, args, expectedUserId }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status})`);
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'value')) throw new Error('Invalid server response. Please sign in again and retry.');
  return payload.value;
}

function getEntry(key: string, ref: string) {
  let entry = cache.get(key);
  if (!entry) {
    // Bound memory for large chapter trees; never evict active subscribers.
    if (cache.size >= MAX_CACHE_ENTRIES) {
      for (const [oldKey, old] of cache) {
        if (!old.listeners.size && !old.request) { cache.delete(oldKey); break; }
      }
    }
    entry = { state: empty, listeners: new Set(), stale: true, version: 0, ref };
    cache.set(key, entry);
  }
  return entry;
}

function notify(entry: Entry) { entry.listeners.forEach((listener) => listener()); }

export function invalidateQueries(prefixes: string[] = ['']) {
  for (const entry of cache.values()) {
    if (prefixes.some((prefix) => entry.ref.startsWith(prefix))) {
      entry.stale = true;
      entry.version++;
      // Keep active training queues stable; they refresh on the next visit.
      if (entry.ref !== 'training.getTrainingLines') {
        entry.state = { ...entry.state };
        notify(entry);
      }
    }
  }
}

function loadEntry(entry: Entry, ref: string, serialized: string, userId?: string) {
    if (entry.request) return entry.request;
    const version = entry.version;
    entry.stale = false;
    entry.state = { ...entry.state, loading: true, error: null };
    notify(entry);
    entry.request = callBackend(ref, JSON.parse(serialized), userId)
      .then((value) => { entry.state = { value, error: null, loading: false }; })
      .catch((error: unknown) => { entry.state = { ...entry.state, loading: false, error: error instanceof Error ? error : new Error(String(error)) }; })
      .finally(() => {
        entry.request = undefined;
        entry.stale = entry.version !== version;
        notify(entry);
      });
    return entry.request;
}

export function useQueryState<Ref extends string>(ref: Ref, args: Record<string, unknown> | 'skip' = {}) {
  const { user, loading } = useAuth();
  const publicQuery = ref.startsWith('courses.getPublic') || ref === 'sharing.resolveToken';
  const skip = args === 'skip' || loading || (!user && !publicQuery);
  const serialized = args === 'skip' ? '{}' : JSON.stringify(args);
  const userId = user?.id;
  const key = `${userId ?? 'public'}\u0000${ref}\u0000${serialized}`;
  const entry = useMemo(() => getEntry(key, ref), [key, ref]);
  const subscribe = useCallback((listener: () => void) => {
    if (skip) return () => {};
    entry.listeners.add(listener);
    return () => { entry.listeners.delete(listener); };
  }, [entry, skip]);
  const getSnapshot = useCallback(() => skip ? empty : entry.state, [entry, skip]);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => empty);

  const run = useCallback(() => {
    if (skip) return;
    return loadEntry(entry, ref, serialized, userId);
  }, [entry, ref, serialized, skip, userId]);

  useEffect(() => { void run(); }, [run]);
  useEffect(() => {
    if (entry.stale && ref !== 'training.getTrainingLines') void run();
  }, [state, entry, ref, run]);
  useEffect(() => {
    const retry = () => { if (entry.state.error) void run(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [entry, run]);
  return { data: state.value as BackendResult<Ref> | undefined, error: state.error, loading: state.loading, retry: run };
}

export function useQuery<Ref extends string>(ref: Ref, args: Record<string, unknown> | 'skip' = {}) {
  return useQueryState(ref, args).data;
}

export function useMutation(ref: string) {
  const { user } = useAuth();
  return useCallback(async (args: any) => {
    const value = await callBackend(ref, args, user?.id);
    if (ref !== 'training.ensureCounterSnapshot') invalidateQueries(ref.startsWith('bookProgress.') ? ['bookProgress.'] : ['']);
    return value;
  }, [ref, user?.id]);
}

export function useConvex() {
  const { user } = useAuth();
  return useMemo(() => ({
    query: <T>(ref: string, args: Record<string, unknown>) => callBackend(ref, args, user?.id) as Promise<T>,
    mutation: async <T>(ref: string, args: Record<string, unknown>) => {
      const result = await callBackend(ref, args, user?.id) as T;
      invalidateQueries();
      return result;
    },
  }), [user?.id]);
}

export function useConvexAuth() {
  const { loading, user } = useAuth();
  return { isLoading: loading, isAuthenticated: Boolean(user) };
}
