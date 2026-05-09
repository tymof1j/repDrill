import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exportReviewLogsCsv } from '@/lib/course/export';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const csv = await exportReviewLogsCsv(session.user.id);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="repdrill-review-logs-${stamp}.csv"`,
    },
  });
}
