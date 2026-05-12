'use server';

import { cookies } from 'next/headers';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@convex/_generated/api';
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
