import 'server-only';

import { withAuth } from '@workos-inc/authkit-nextjs';

/**
 * Transitional names for the files that still call the legacy Convex API.
 * The returned token is a WorkOS access token and is intentionally not
 * treated as a permanent Convex integration. These helpers make the auth
 * cutover explicit while the SQL operation layer replaces the remaining
 * Convex calls.
 */
export async function convexAuthNextjsToken() {
  const { accessToken } = await withAuth();
  return accessToken ?? null;
}

export async function isAuthenticatedNextjs() {
  const { user } = await withAuth();
  return Boolean(user);
}
