'use server';

import { cookies } from 'next/headers';
import { convexAuthNextjsToken } from '@/lib/workos/convex-compat';
import { fetchMutation } from '@/lib/supabase/server-client';
import { api } from '@/lib/supabase/api';
import type { Language } from '@/lib/i18n/translations';

export async function updateLanguageAction(language: Language): Promise<void> {
  const normalized = language === 'uk' ? 'uk' : 'en';
  const cookieStore = await cookies();
  cookieStore.set('repdrill-language', normalized, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  const token = await convexAuthNextjsToken();
  if (token) {
    await fetchMutation(api.users.updateLanguage, { language: normalized }, { token });
  }
}
