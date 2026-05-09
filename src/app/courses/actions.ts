'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { courses, chapters, positions } from '@/lib/db/schema';
import { parsePgn } from '@/lib/chess/pgn-parser';
import { buildTree } from '@/lib/chess/tree';
import { importTreeIntoChapter } from '@/lib/course/import';
import { getCourse } from '@/lib/course/queries';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user.id;
}

export async function createCourseAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const name = String(formData.get('name') ?? '').trim();
  const color = String(formData.get('color') ?? '') as 'white' | 'black';
  const description = String(formData.get('description') ?? '').trim() || null;

  if (!name) throw new Error('Name is required');
  if (color !== 'white' && color !== 'black') throw new Error('Color must be white or black');

  const id = nanoid(12);
  const now = new Date();
  await db.insert(courses).values({
    id,
    userId,
    name,
    color,
    description,
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath('/courses');
  redirect(`/courses/${id}`);
}

export async function deleteCourseAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing id');

  await db.delete(courses).where(and(eq(courses.id, id), eq(courses.userId, userId)));
  revalidatePath('/courses');
  redirect('/courses');
}

export async function importPgnAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const courseId = String(formData.get('courseId') ?? '');
  const pgnText = String(formData.get('pgn') ?? '').trim();
  if (!courseId) throw new Error('Missing courseId');
  if (!pgnText) throw new Error('Paste a PGN');

  const course = await getCourse(userId, courseId);
  if (!course) throw new Error('Course not found');

  const games = parsePgn(pgnText);
  if (games.length === 0) throw new Error('No games found in PGN');

  const now = new Date();
  for (const [i, game] of games.entries()) {
    // Prefer Lichess study's ChapterName, fall back through reasonable alternatives.
    const chapterName =
      game.headers.ChapterName ||
      game.headers.Event ||
      game.headers.White ||
      `Chapter ${i + 1}`;
    const chapterId = nanoid(12);
    await db.insert(chapters).values({
      id: chapterId,
      courseId,
      name: chapterName,
      sortOrder: i,
      createdAt: now,
    });

    const tree = buildTree(game);
    await importTreeIntoChapter({
      userId,
      chapterId,
      courseColor: course.color as 'white' | 'black',
      tree,
    });
  }

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

export async function renameCourseAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) throw new Error('Missing id or name');

  await db
    .update(courses)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(courses.id, id), eq(courses.userId, userId)));
  revalidatePath(`/courses/${id}`);
  revalidatePath('/courses');
}

export async function renameChapterAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get('id') ?? '');
  const courseId = String(formData.get('courseId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) throw new Error('Missing id or name');

  await db.update(chapters).set({ name }).where(eq(chapters.id, id));
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteChapterAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get('id') ?? '');
  const courseId = String(formData.get('courseId') ?? '');
  if (!id) throw new Error('Missing id');

  await db.delete(chapters).where(eq(chapters.id, id));
  revalidatePath(`/courses/${courseId}`);
}

export async function updateAnnotationAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const positionId = String(formData.get('positionId') ?? '');
  const text = String(formData.get('text') ?? '');
  if (!positionId) throw new Error('Missing positionId');

  await db
    .update(positions)
    .set({ annotation: text || null })
    .where(and(eq(positions.id, positionId), eq(positions.userId, userId)));
  revalidatePath('/courses');
}
