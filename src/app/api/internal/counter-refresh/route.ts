import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseDb } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Supabase Cron/pg_net entry point. The route is not authenticated by a user
 * session; it is protected by a deployment-only secret and only invokes the
 * SQL function that recomputes cached counters.
 */
async function refreshCounters(request: NextRequest) {
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    ?? request.headers.get('x-counter-refresh-secret');
  const validSecrets = [process.env.COUNTER_REFRESH_SECRET, process.env.CRON_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  if (!supplied || validSecrets.length === 0 || !validSecrets.includes(supplied)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseDb();
  const jobs = await db`
    select user_id, force_refresh, course_ids
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
      const snapshots = await db`
        select max(computed_at) as computed_at
        from public.counter_snapshots
        where user_id = ${job.user_id} and course_id is null
      `;
      const activity = await db`
        select max(rl.reviewed_at) as reviewed_at
        from public.review_logs rl
        join public.review_cards rc on rc.id = rl.card_id
        join public.moves m on m.id = rc.move_id
        join public.chapters ch on ch.id = m.chapter_id
        where rc.user_id = ${job.user_id}
          and (${job.course_ids}::uuid[] is null or ch.course_id = any(${job.course_ids}::uuid[]))
      `;
      const computedAt = snapshots[0]?.computed_at ? new Date(snapshots[0].computed_at).getTime() : 0;
      const reviewedAt = activity[0]?.reviewed_at ? new Date(activity[0].reviewed_at).getTime() : 0;
      const shouldRefresh = Boolean(job.force_refresh) || !computedAt || reviewedAt > computedAt;
      if (shouldRefresh) {
        await db`select public.refresh_counter_snapshots(${job.user_id}, ${job.course_ids}::uuid[])`;
        refreshedUsers++;
      }
      await db`update public.counter_refresh_jobs set status = 'done', force_refresh = false, course_ids = null, completed_at = now() where user_id = ${job.user_id}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db`update public.counter_refresh_jobs set status = 'failed', error = ${message} where user_id = ${job.user_id}`;
    }
  }
  return NextResponse.json({ refreshedUsers, queuedJobs: jobs.length });
}

// Vercel Cron invokes the route with GET; POST remains supported for a
// Supabase pg_net/manual scheduler.
export async function GET(request: NextRequest) {
  return refreshCounters(request);
}

export async function POST(request: NextRequest) {
  return refreshCounters(request);
}
