import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { ensureAppUser } from '@/lib/workos/server';
import { executeSupabaseOperation } from '@/lib/supabase/operations';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { operation?: unknown; args?: unknown } | null;
  if (!body || typeof body.operation !== 'string') {
    return NextResponse.json({ error: 'Invalid backend operation' }, { status: 400 });
  }

  const { user } = await withAuth();
  const publicOperation = body.operation.startsWith('courses.getPublic') || body.operation.startsWith('sharing.resolve');
  if (!user && !publicOperation) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const appUser = user ? await ensureAppUser() : null;
  try {
    const value = await executeSupabaseOperation(body.operation, (body.args ?? {}) as Record<string, unknown>, appUser as Parameters<typeof executeSupabaseOperation>[2]);
    return NextResponse.json({ value });
  } catch (error) {
    console.error(`Supabase operation failed: ${body.operation}`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Backend operation failed' }, { status: 500 });
  }
}
