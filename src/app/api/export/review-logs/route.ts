import { NextResponse } from 'next/server';
import { convexAuthNextjsToken } from '@/lib/workos/convex-compat';
import { fetchQuery } from '@/lib/supabase/server-client';
import { api } from '@/lib/supabase/api';

export async function GET() {
  const token = await convexAuthNextjsToken();
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const { logs } = await fetchQuery(api.training.exportReviewData, {}, { token });
  const header = 'reviewedAt,cardId,rating,responseTimeMs,prevStability,prevDifficulty,prevState\n';
  const rows = logs
    .map((log) =>
      [
        new Date(log.reviewedAt).toISOString(),
        log.cardId,
        log.rating,
        log.responseTimeMs ?? '',
        log.prevStability ?? '',
        log.prevDifficulty ?? '',
        log.prevState ?? '',
      ].join(','),
    )
    .join('\n');
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(header + rows + (rows ? '\n' : ''), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="repdrill-review-logs-${stamp}.csv"`,
    },
  });
}
