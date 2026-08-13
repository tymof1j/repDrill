import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseDb } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Supabase Cron/pg_net entry point. The route is not authenticated by a user
 * session; it is protected by a deployment-only secret and only invokes the
 * SQL function that recomputes cached counters.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.COUNTER_REFRESH_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    ?? request.headers.get('x-counter-refresh-secret');
  if (!expected || supplied !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseDb();
  const jobs = await db`
    select user_id
    from public.counter_refresh_jobs
    where status = 'queued'
       or (status = 'running' and started_at < now() - interval '30 minutes')
    order by requested_at
    limit 100
  `;
  let refreshedUsers = 0;
  for (const job of jobs) {
    await db`update public.counter_refresh_jobs set status = 'running', started_at = now(), error = null where user_id = ${job.user_id}`;
    try {
      await db`select public.refresh_counter_snapshots(${job.user_id})`;
      await db`update public.counter_refresh_jobs set status = 'done', completed_at = now() where user_id = ${job.user_id}`;
      refreshedUsers++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db`update public.counter_refresh_jobs set status = 'failed', error = ${message} where user_id = ${job.user_id}`;
    }
  }
  return NextResponse.json({ refreshedUsers, queuedJobs: jobs.length });
}
