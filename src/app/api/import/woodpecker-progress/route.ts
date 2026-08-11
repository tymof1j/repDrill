import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { api } from '@convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';
import type { FunctionArgs } from 'convex/server';
import { NextResponse } from 'next/server';

const MAX_BODY_BYTES = 512 * 1_024;

type LegacyImportArgs = FunctionArgs<typeof api.bookProgress.importLegacyWoodpecker>;

/**
 * One-time bridge for the user's normalized Woodpecker legacy export.
 * Authentication comes only from the current Next.js/Convex session; the
 * request body never accepts a user id.
 */
export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== requestUrl.origin) {
    return new NextResponse('Cross-origin imports are not allowed', { status: 403 });
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return new NextResponse('Content-Type must be application/json', { status: 415 });
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return new NextResponse('Import payload is too large', { status: 413 });
  }

  const token = await convexAuthNextjsToken();
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  let payload: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return new NextResponse('Import payload is too large', { status: 413 });
    }
    payload = JSON.parse(body);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return new NextResponse('Import payload must be a JSON object', { status: 400 });
  }

  try {
    const result = await fetchMutation(
      api.bookProgress.importLegacyWoodpecker,
      payload as LegacyImportArgs,
      { token },
    );
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Legacy progress import failed';
    const conflict = /already|cannot be overwritten|progress already/i.test(message);
    return new NextResponse(message, {
      status: conflict ? 409 : 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
