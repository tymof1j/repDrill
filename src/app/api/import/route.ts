import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { importBundle } from '@/lib/course/import-bundle';
import type { ExportBundle } from '@/lib/course/export';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let bundle: ExportBundle;
  try {
    bundle = (await req.json()) as ExportBundle;
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  if (!bundle || typeof bundle !== 'object' || bundle.version !== 1) {
    return new NextResponse('Unsupported bundle', { status: 400 });
  }

  try {
    const summary = await importBundle(session.user.id, bundle);
    return NextResponse.json(summary);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : 'Import failed', {
      status: 500,
    });
  }
}
