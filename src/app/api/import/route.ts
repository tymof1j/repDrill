import { NextResponse } from 'next/server';
import { convexAuthNextjsToken } from '@/lib/workos/convex-compat';
import { fetchMutation } from '@/lib/supabase/server-client';
import { api } from '@/lib/supabase/api';

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
