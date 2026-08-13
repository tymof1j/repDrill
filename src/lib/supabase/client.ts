/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import type { BackendResult } from './types';

type Ref = string;
type Skip = 'skip';

async function callBackend(operation: Ref, args: unknown, method: 'GET' | 'POST' = 'POST') {
  const response = await fetch('/api/backend', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operation, args }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error ?? `Backend request failed (${response.status})`);
  return payload?.value;
}

export function useQuery<RefName extends Ref>(ref: RefName, args: Record<string, unknown> | Skip = {}): BackendResult<RefName> | undefined {
  const skipped = args === 'skip';
  const serializedArgs = skipped ? '' : JSON.stringify(args);
  const [state, setState] = useState<{ value: any; error: Error | null }>({ value: undefined, error: null });

  useEffect(() => {
    let cancelled = false;
    if (skipped) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ value: undefined, error: null });
      return () => { cancelled = true; };
    }
    callBackend(ref, JSON.parse(serializedArgs))
      .then((value) => { if (!cancelled) setState({ value, error: null }); })
      .catch((error: unknown) => { if (!cancelled) setState({ value: undefined, error: error instanceof Error ? error : new Error(String(error)) }); });
    return () => { cancelled = true; };
  }, [ref, serializedArgs, skipped]);

  // Match the old reactive client's non-throwing loading behavior. A backend
  // outage should leave the page in a recoverable loading/empty state rather
  // than crash the whole React tree.
  if (state.error) return undefined;
  return state.value as BackendResult<RefName> | undefined;
}

export function useMutation(ref: Ref) {
  return useCallback((args: any) => callBackend(ref, args) as Promise<any>, [ref]);
}

export function useConvex() {
  return useMemo(() => ({
    query: <T>(ref: Ref, args: Record<string, unknown>) => callBackend(ref, args) as Promise<T>,
    mutation: <T>(ref: Ref, args: Record<string, unknown>) => callBackend(ref, args) as Promise<T>,
  }), []);
}

export function useConvexAuth() {
  const { loading, user } = useAuth();
  return { isLoading: loading, isAuthenticated: Boolean(user) };
}
