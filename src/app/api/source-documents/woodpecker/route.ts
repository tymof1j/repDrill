import { convexAuthNextjsToken } from '@/lib/workos/convex-compat';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORWARDED_RESPONSE_HEADERS = [
  'accept-ranges',
  'content-length',
  'content-range',
  'etag',
  'last-modified',
] as const;

export async function GET(request: Request) {
  const token = await convexAuthNextjsToken();
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const sourceUrl = process.env.WOODPECKER_SOURCE_PDF_URL?.trim();
  if (!sourceUrl) {
    return new NextResponse('Source document is not configured', { status: 404 });
  }

  try {
    const requestHeaders = new Headers();
    const range = request.headers.get('range');
    if (range) requestHeaders.set('range', range);

    const bearerToken = process.env.WOODPECKER_SOURCE_PDF_BEARER_TOKEN?.trim();
    if (bearerToken) requestHeaders.set('authorization', `Bearer ${bearerToken}`);

    const upstream = await fetch(sourceUrl, {
      cache: 'no-store',
      headers: requestHeaders,
      redirect: 'follow',
    });
    if (!upstream.ok || !upstream.body) {
      return new NextResponse('Source document is unavailable', { status: 502 });
    }

    const responseHeaders = new Headers({
      'cache-control': 'private, no-store, max-age=0',
      'content-disposition': 'inline; filename="source-document.pdf"',
      'content-type': 'application/pdf',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    });
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new NextResponse('Source document is unavailable', { status: 502 });
  }
}
