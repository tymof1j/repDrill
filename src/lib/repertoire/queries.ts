import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  repertoires,
  repertoireCourses,
  repertoireChoices,
  courses,
  chapters,
  moves,
  positions,
} from '@/lib/db/schema';

export async function listRepertoires(userId: string) {
  return db
    .select()
    .from(repertoires)
    .where(eq(repertoires.userId, userId))
    .orderBy(repertoires.createdAt);
}

export async function getRepertoire(userId: string, id: string) {
  const rows = await db
    .select()
    .from(repertoires)
    .where(and(eq(repertoires.id, id), eq(repertoires.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Courses included in a repertoire, joined with course data, ordered. */
export async function listRepertoireCourses(repertoireId: string) {
  const rows = await db
    .select({
      junctionId: repertoireCourses.id,
      sortOrder: repertoireCourses.sortOrder,
      course: courses,
    })
    .from(repertoireCourses)
    .innerJoin(courses, eq(courses.id, repertoireCourses.courseId))
    .where(eq(repertoireCourses.repertoireId, repertoireId))
    .orderBy(repertoireCourses.sortOrder);
  return rows;
}

/** Aggregate everything needed to display a repertoire's merged tree:
 *  all chapters (across included courses), all moves, all positions. */
export async function loadRepertoireTree(repertoireId: string) {
  const courseRows = await listRepertoireCourses(repertoireId);
  const courseIds = courseRows.map((r) => r.course.id);

  if (courseIds.length === 0) {
    return { courses: courseRows, chapters: [], moves: [], positions: [], choices: [] };
  }

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(inArray(chapters.courseId, courseIds));
  const chapterIds = chapterRows.map((c) => c.id);

  const moveRows =
    chapterIds.length === 0
      ? []
      : await db.select().from(moves).where(inArray(moves.chapterId, chapterIds));

  const positionIds = new Set<string>();
  for (const m of moveRows) {
    positionIds.add(m.parentPositionId);
    positionIds.add(m.childPositionId);
  }
  const positionRows =
    positionIds.size === 0
      ? []
      : await db.select().from(positions).where(inArray(positions.id, Array.from(positionIds)));

  const choiceRows = await db
    .select()
    .from(repertoireChoices)
    .where(eq(repertoireChoices.repertoireId, repertoireId));

  return {
    courses: courseRows,
    chapters: chapterRows,
    moves: moveRows,
    positions: positionRows,
    choices: choiceRows,
  };
}
