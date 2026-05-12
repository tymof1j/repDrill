'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

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
