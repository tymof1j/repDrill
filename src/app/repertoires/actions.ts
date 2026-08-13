'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { convexAuthNextjsToken } from '@/lib/workos/convex-compat';
import { fetchMutation, fetchQuery } from '@/lib/supabase/server-client';
import { api } from '@/lib/supabase/api';
import type { Id } from '@/lib/supabase/types';

async function requireToken() {
  const token = await convexAuthNextjsToken();
  if (!token) redirect('/login');
  return token;
}

export async function createRepertoireAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || undefined;
  if (!name) throw new Error('Name is required');

  const id = await fetchMutation(api.repertoires.create, { name, description }, { token });
  revalidatePath('/repertoires');
  redirect(`/repertoires/${id}`);
}

export async function deleteRepertoireAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"repertoires">;
  if (!id) throw new Error('Missing id');

  await fetchMutation(api.repertoires.remove, { id }, { token });
  revalidatePath('/repertoires');
  redirect('/repertoires');
}

export async function addCourseToRepertoireAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const repertoireId = String(formData.get('repertoireId') ?? '') as Id<"repertoires">;
  const courseId = String(formData.get('courseId') ?? '') as Id<"courses">;
  if (!repertoireId || !courseId) throw new Error('Missing ids');

  await fetchMutation(api.repertoires.addCourse, { repertoireId, courseId }, { token });
  revalidatePath(`/repertoires/${repertoireId}`);
}

export async function removeCourseFromRepertoireAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const repertoireId = String(formData.get('repertoireId') ?? '') as Id<"repertoires">;
  const courseId = String(formData.get('courseId') ?? '') as Id<"courses">;
  if (!repertoireId || !courseId) throw new Error('Missing ids');

  await fetchMutation(api.repertoires.removeCourse, { repertoireId, courseId }, { token });
  revalidatePath(`/repertoires/${repertoireId}`);
}

export async function renameRepertoireAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"repertoires">;
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) throw new Error('Missing id or name');

  await fetchMutation(api.repertoires.rename, { id, name }, { token });
  revalidatePath(`/repertoires/${id}`);
  revalidatePath('/repertoires');
}

export async function setRepertoireChoiceAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const repertoireId = String(formData.get('repertoireId') ?? '') as Id<"repertoires">;
  const positionId = String(formData.get('positionId') ?? '') as Id<"positions">;
  const moveId = String(formData.get('moveId') ?? '') as Id<"moves">;
  if (!repertoireId || !positionId || !moveId) throw new Error('Missing ids');

  await fetchMutation(api.repertoires.setChoice, { repertoireId, positionId, moveId }, { token });
  revalidatePath(`/repertoires/${repertoireId}`);
}

export async function clearRepertoireChoiceAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const repertoireId = String(formData.get('repertoireId') ?? '') as Id<"repertoires">;
  const positionId = String(formData.get('positionId') ?? '') as Id<"positions">;
  if (!repertoireId || !positionId) throw new Error('Missing ids');

  await fetchMutation(api.repertoires.clearChoice, { repertoireId, positionId }, { token });
  revalidatePath(`/repertoires/${repertoireId}`);
}
