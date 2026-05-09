import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courses, chapters, positions, moves } from '@/lib/db/schema';

export async function listCourses(userId: string) {
  return db
    .select()
    .from(courses)
    .where(eq(courses.userId, userId))
    .orderBy(courses.createdAt);
}

export async function getCourse(userId: string, id: string) {
  const rows = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listChapters(courseId: string) {
  return db
    .select()
    .from(chapters)
    .where(eq(chapters.courseId, courseId))
    .orderBy(chapters.sortOrder, chapters.createdAt);
}

export async function listMovesByChapter(chapterId: string) {
  return db.select().from(moves).where(eq(moves.chapterId, chapterId));
}

export async function getPositionByFen(userId: string, fen: string) {
  const rows = await db
    .select()
    .from(positions)
    .where(and(eq(positions.userId, userId), eq(positions.fen, fen)))
    .limit(1);
  return rows[0] ?? null;
}

export type CourseRow = Awaited<ReturnType<typeof listCourses>>[number];
export type ChapterRow = Awaited<ReturnType<typeof listChapters>>[number];
export type MoveRow = Awaited<ReturnType<typeof listMovesByChapter>>[number];
