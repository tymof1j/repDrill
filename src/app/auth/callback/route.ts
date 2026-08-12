import { handleAuth } from '@workos-inc/authkit-nextjs';

const siteUrl = process.env.SITE_URL?.trim().replace(/\/$/, '');

// Explicitly pin the callback exchange to the canonical origin in production.
// This prevents the request host (for example, a Vercel preview URL) from
// silently producing a callback URI that is not registered in WorkOS.
export const GET = siteUrl ? handleAuth({ baseURL: siteUrl }) : handleAuth();
