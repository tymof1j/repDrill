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
  // The database worker locks jobs and updates snapshots in one transaction.
  // Calling it directly also prevents overlapping cron requests from losing a
  // newly queued review while marking an older job done.
  const [result] = await db`select public.process_counter_refresh_jobs() as refreshed_users`;
  return NextResponse.json({ refreshedUsers: result.refreshed_users });
}

// Vercel Cron invokes the route with GET; POST remains supported for a
// Supabase pg_net/manual scheduler.
export async function GET(request: NextRequest) {
  return refreshCounters(request);
}

export async function POST(request: NextRequest) {
  return refreshCounters(request);
}
