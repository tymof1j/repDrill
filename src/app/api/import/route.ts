import { NextResponse } from 'next/server';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@convex/_generated/api';

export async function POST(req: Request) {
  const token = await convexAuthNextjsToken();
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  let bundle: unknown;
  try {
    bundle = await req.json();
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  try {
    const summary = await fetchMutation(api.import.importBundle, { bundle }, { token });
    return NextResponse.json(summary);
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Import failed', {
      status: 500,
    });
  }
}
