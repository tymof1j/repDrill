import { handleAuth } from '@workos-inc/authkit-nextjs';
import { getCanonicalSiteUrl } from '@/lib/workos/config';

const siteUrl = getCanonicalSiteUrl();

// Explicitly pin the callback exchange to the canonical origin in production.
// This prevents the request host (for example, a Vercel preview URL) from
// silently producing a callback URI that is not registered in WorkOS.
export const GET = siteUrl ? handleAuth({ baseURL: siteUrl }) : handleAuth();
