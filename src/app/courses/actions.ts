'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { parsePgn } from '@/lib/chess/pgn-parser';
import { buildTree } from '@/lib/chess/tree';

async function requireToken() {
  const token = await convexAuthNextjsToken();
  if (!token) redirect('/login');
  return token;
}

export async function createCourseAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const name = String(formData.get('name') ?? '').trim();
  const color = String(formData.get('color') ?? '') as 'white' | 'black';
  const description = String(formData.get('description') ?? '').trim() || undefined;

  if (!name) throw new Error('Name is required');
  if (color !== 'white' && color !== 'black') throw new Error('Color must be white or black');

  const id = await fetchMutation(api.courses.create, { name, color, description }, { token });
  revalidatePath('/courses');
  redirect(`/courses/${id}`);
}

export async function deleteCourseAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"courses">;
  if (!id) throw new Error('Missing id');

  await fetchMutation(api.courses.remove, { id }, { token });
  revalidatePath('/courses');
  redirect('/courses');
}

export async function importPgnAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const courseId = String(formData.get('courseId') ?? '') as Id<"courses">;
  const pgnText = String(formData.get('pgn') ?? '').trim();
  if (!courseId) throw new Error('Missing courseId');
  if (!pgnText) throw new Error('Paste a PGN');

  const course = await fetchQuery(api.courses.get, { id: courseId }, { token });
  if (!course) throw new Error('Course not found');

  const games = parsePgn(pgnText);
  if (games.length === 0) throw new Error('No games found in PGN');

  for (const [i, game] of games.entries()) {
    const chapterName =
      game.headers.ChapterName ||
      game.headers.Event ||
      game.headers.White ||
      `Chapter ${i + 1}`;

    const tree = buildTree(game);
    await fetchMutation(
      api.import.importTreeIntoChapter,
      {
        courseId,
        chapterName,
        sortOrder: i,
        courseColor: course.color,
        rootFen: tree.rootFen,
        moves: tree.moves.map((m) => ({
          parentFen: m.parentFen,
          fen: m.fen,
          san: m.san,
          uci: m.uci,
          moveNumber: m.moveNumber,
          colorToMove: m.colorToMove,
          comment: m.comment,
          isMainLine: m.isMainLine,
        })),
      },
      { token }
    );
  }

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

export async function renameCourseAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"courses">;
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) throw new Error('Missing id or name');

  await fetchMutation(api.courses.rename, { id, name }, { token });
  revalidatePath(`/courses/${id}`);
  revalidatePath('/courses');
}

export async function renameChapterAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"chapters">;
  const courseId = String(formData.get('courseId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) throw new Error('Missing id or name');

  await fetchMutation(api.courses.renameChapter, { id, name }, { token });
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteChapterAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"chapters">;
  const courseId = String(formData.get('courseId') ?? '');
  if (!id) throw new Error('Missing id');

  await fetchMutation(api.courses.deleteChapter, { id }, { token });
  revalidatePath(`/courses/${courseId}`);
}

export async function setSharingAction(formData: FormData): Promise<{ token: string | null; isPublic: boolean }> {
  const token = await requireToken();
  const courseId = String(formData.get('courseId') ?? '') as Id<"courses">;
  const intent = String(formData.get('intent') ?? '') as 'enable' | 'disable' | 'rotate';
  if (!courseId) throw new Error('Missing courseId');

  const result = await fetchMutation(api.courses.setSharing, { courseId, intent }, { token });
  revalidatePath(`/courses/${courseId}`);
  return { token: result.token ?? null, isPublic: result.isPublic };
}

export async function copySharedCourseAction(formData: FormData): Promise<void> {
  // TODO: Implement shared course copying for Convex
  throw new Error('Shared course copying not yet implemented for Convex');
}

export async function updateAnnotationAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const positionId = String(formData.get('positionId') ?? '') as Id<"positions">;
  const text = String(formData.get('text') ?? '');
  if (!positionId) throw new Error('Missing positionId');

  await fetchMutation(api.courses.updateAnnotation, { positionId, text: text || '' }, { token });
  revalidatePath('/courses');
}
