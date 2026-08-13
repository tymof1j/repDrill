import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { getWorkOSRedirectUri } from '@/lib/workos/config';

function safeReturnTo(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/courses';
}

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get('returnTo'));
  redirect(await getSignInUrl({
    returnTo,
    redirectUri: getWorkOSRedirectUri(),
  }));
}
