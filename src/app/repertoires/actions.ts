'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  repertoires,
  repertoireCourses,
  repertoireChoices,
  courses,
} from '@/lib/db/schema';
import { getRepertoire } from '@/lib/repertoire/queries';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user.id;
}

export async function createRepertoireAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  if (!name) throw new Error('Name is required');

  const id = nanoid(12);
  const now = new Date();
  await db.insert(repertoires).values({
    id,
    userId,
    name,
    description,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath('/repertoires');
  redirect(`/repertoires/${id}`);
}

export async function deleteRepertoireAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing id');

  await db
    .delete(repertoires)
    .where(and(eq(repertoires.id, id), eq(repertoires.userId, userId)));
  revalidatePath('/repertoires');
  redirect('/repertoires');
}

export async function addCourseToRepertoireAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const repertoireId = String(formData.get('repertoireId') ?? '');
  const courseId = String(formData.get('courseId') ?? '');
  if (!repertoireId || !courseId) throw new Error('Missing ids');

  // Verify ownership
  const rep = await getRepertoire(userId, repertoireId);
  if (!rep) throw new Error('Repertoire not found');
  const course = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
    .limit(1);
  if (!course[0]) throw new Error('Course not found');

  // Determine next sort order
  const existing = await db
    .select({ sortOrder: repertoireCourses.sortOrder })
    .from(repertoireCourses)
    .where(eq(repertoireCourses.repertoireId, repertoireId));
  const nextOrder = existing.reduce((max, r) => Math.max(max, r.sortOrder + 1), 0);

  // Insert; rely on unique index to silently no-op if already linked
  try {
    await db.insert(repertoireCourses).values({
      id: nanoid(12),
      repertoireId,
      courseId,
      sortOrder: nextOrder,
    });
  } catch {
    // Unique constraint — already added.
  }

  revalidatePath(`/repertoires/${repertoireId}`);
}

export async function removeCourseFromRepertoireAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const repertoireId = String(formData.get('repertoireId') ?? '');
  const courseId = String(formData.get('courseId') ?? '');
  if (!repertoireId || !courseId) throw new Error('Missing ids');

  const rep = await getRepertoire(userId, repertoireId);
  if (!rep) throw new Error('Repertoire not found');

  await db
    .delete(repertoireCourses)
    .where(
      and(
        eq(repertoireCourses.repertoireId, repertoireId),
        eq(repertoireCourses.courseId, courseId),
      ),
    );

  revalidatePath(`/repertoires/${repertoireId}`);
}

export async function setRepertoireChoiceAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const repertoireId = String(formData.get('repertoireId') ?? '');
  const positionId = String(formData.get('positionId') ?? '');
  const moveId = String(formData.get('moveId') ?? '');
  if (!repertoireId || !positionId || !moveId) throw new Error('Missing ids');

  const rep = await getRepertoire(userId, repertoireId);
  if (!rep) throw new Error('Repertoire not found');

  // Upsert: delete existing choice for this position, insert new one
  await db
    .delete(repertoireChoices)
    .where(
      and(
        eq(repertoireChoices.repertoireId, repertoireId),
        eq(repertoireChoices.positionId, positionId),
      ),
    );

  await db.insert(repertoireChoices).values({
    id: nanoid(12),
    repertoireId,
    positionId,
    preferredMoveId: moveId,
  });

  revalidatePath(`/repertoires/${repertoireId}`);
}

export async function clearRepertoireChoiceAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const repertoireId = String(formData.get('repertoireId') ?? '');
  const positionId = String(formData.get('positionId') ?? '');
  if (!repertoireId || !positionId) throw new Error('Missing ids');

  const rep = await getRepertoire(userId, repertoireId);
  if (!rep) throw new Error('Repertoire not found');

  await db
    .delete(repertoireChoices)
    .where(
      and(
        eq(repertoireChoices.repertoireId, repertoireId),
        eq(repertoireChoices.positionId, positionId),
      ),
    );

  revalidatePath(`/repertoires/${repertoireId}`);
}
