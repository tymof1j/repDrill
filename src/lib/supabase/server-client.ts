/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';

import { ensureAppUser, withAuth } from '@/lib/workos/server';
import { executeSupabaseOperation } from './operations';
import type { BackendResult } from './types';

type Ref = string;

export async function fetchQuery<RefName extends Ref, T = BackendResult<RefName>>(ref: RefName, args: Record<string, unknown>, _options?: unknown): Promise<T> {
  const { user } = await withAuth();
  return executeSupabaseOperation(ref, args, (user ? await ensureAppUser() : null) as any) as Promise<T>;
}

export async function fetchMutation<RefName extends Ref, T = BackendResult<RefName>>(ref: RefName, args: Record<string, unknown>, _options?: unknown): Promise<T> {
  return executeSupabaseOperation(ref, args, await ensureAppUser() as any) as Promise<T>;
}
