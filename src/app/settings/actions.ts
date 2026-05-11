'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user.id;
}

export async function updateUsernamesAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const rawLichess = String(formData.get('lichess') ?? '').trim();
  const rawChesscom = String(formData.get('chesscom') ?? '').trim();
  const lichess = rawLichess || null;
  const chesscom = rawChesscom || null;

  await db
    .update(users)
    .set({
      lichessUsername: lichess,
      chesscomUsername: chesscom,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/settings');
  revalidatePath('/analyze');
}

export async function updateLanguageAction(nextLanguage: string): Promise<void> {
  const userId = await requireUserId();
  const language: 'en' | 'uk' = nextLanguage === 'uk' ? 'uk' : 'en';

  await db
    .update(users)
    .set({
      language,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/', 'layout');
  revalidatePath('/settings');
}
