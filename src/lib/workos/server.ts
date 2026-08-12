import 'server-only';

import { withAuth, getSignInUrl, signOut } from '@workos-inc/authkit-nextjs';
import { getSupabaseDb } from '@/lib/supabase/server';

export { getSignInUrl, signOut, withAuth };

export async function isAuthenticated() {
  const { user } = await withAuth();
  return Boolean(user);
}

export async function getCurrentWorkOSUser() {
  const { user } = await withAuth();
  return user;
}

/**
 * Make the WorkOS identity available to application tables. This is an
 * upsert, so it is safe to call on every authenticated server request and it
 * also handles a WorkOS profile update without a separate webhook race.
 */
export async function ensureAppUser() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const db = getSupabaseDb();
  const linkedRows = await db`
    update public.users
    set workos_user_id = ${user.id},
        name = ${user.firstName || user.lastName ? [user.firstName, user.lastName].filter(Boolean).join(' ') : null},
        image = ${user.profilePictureUrl ?? null},
        email = ${user.email},
        email_verification_time = ${user.emailVerified ? new Date() : null},
        updated_at = now()
    where workos_user_id is null and lower(email) = lower(${user.email})
    returning *
  `;
  if (linkedRows[0]) return linkedRows[0];

  const rows = await db`
    insert into public.users (workos_user_id, name, image, email, email_verification_time, updated_at)
    values (
      ${user.id},
      ${user.firstName || user.lastName ? [user.firstName, user.lastName].filter(Boolean).join(' ') : null},
      ${user.profilePictureUrl ?? null},
      ${user.email},
      ${user.emailVerified ? new Date() : null},
      now()
    )
    on conflict (workos_user_id) do update set
      name = excluded.name,
      image = excluded.image,
      email = excluded.email,
      email_verification_time = excluded.email_verification_time,
      updated_at = now()
    returning *
  `;
  if (!rows[0]) throw new Error('Unable to provision the authenticated RepDrill user');
  return rows[0];
}
