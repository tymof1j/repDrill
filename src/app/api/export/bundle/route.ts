import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exportFullBundle } from '@/lib/course/export';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const bundle = await exportFullBundle(session.user.id);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="repdrill-export-${stamp}.json"`,
    },
  });
}
