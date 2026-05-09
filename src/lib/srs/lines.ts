import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  courses, chapters, moves, positions, reviewCards,
} from '@/lib/db/schema';
import { normalizeFen } from '@/lib/chess/fen';
import { ensureCardsExist } from './queries';

export type LineStep = {
  san: string;
  uci: string;
  parentFen: string;
  childFen: string;
  moveNumber: number;
  isUserMove: boolean;
  annotation: string | null;
  cardId: string | null;
  isNew: boolean;
};

export type TrainingLine = {
  lineId: string;
  courseName: string;
  courseColor: 'white' | 'black';
  chapterName: string;
  steps: LineStep[];
  isNew: boolean;
  dueCount: number;
};

const ROOT_FEN = normalizeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

export async function getTrainingLines(
  userId: string,
  opts: { courseId?: string; newLineLimit?: number } = {},
): Promise<{ lines: TrainingLine[]; totalLines: number; dueLines: number; newLines: number }> {
  const newLineLimit = opts.newLineLimit ?? 5;

  await ensureCardsExist(userId);

  const courseFilter = opts.courseId
    ? [eq(courses.id, opts.courseId), eq(courses.userId, userId)]
    : [eq(courses.userId, userId)];
  const userCourses = await db.select().from(courses).where(
    courseFilter.length === 1 ? courseFilter[0] : eq(courses.userId, userId),
  );
  if (opts.courseId) {
    const filtered = userCourses.filter((c) => c.id === opts.courseId);
    userCourses.length = 0;
    userCourses.push(...filtered);
  }
  if (userCourses.length === 0)
    return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };

  const courseIds = userCourses.map((c) => c.id);
  const allChapters = await db.select().from(chapters).where(inArray(chapters.courseId, courseIds));
  if (allChapters.length === 0)
    return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };

  const chapterIds = allChapters.map((c) => c.id);
  const allMoves = await db.select().from(moves).where(inArray(moves.chapterId, chapterIds));
  if (allMoves.length === 0)
    return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };

  const posIds = new Set<string>();
  for (const m of allMoves) {
    posIds.add(m.parentPositionId);
    posIds.add(m.childPositionId);
  }
  const allPositions = await db
    .select()
    .from(positions)
    .where(inArray(positions.id, Array.from(posIds)));
  const posById = new Map(allPositions.map((p) => [p.id, p]));

  const allCards = await db.select().from(reviewCards).where(eq(reviewCards.userId, userId));
  const cardByMoveId = new Map(allCards.map((c) => [c.moveId, c]));

  const chapById = new Map(allChapters.map((c) => [c.id, c]));
  const courseById = new Map(userCourses.map((c) => [c.id, c]));

  const rootPos = allPositions.find((p) => p.fen === ROOT_FEN);
  if (!rootPos)
    return { lines: [], totalLines: 0, dueLines: 0, newLines: 0 };

  // Build adjacency per chapter
  const movesByParentByChapter = new Map<string, Map<string, (typeof allMoves)>>();
  for (const m of allMoves) {
    let chMap = movesByParentByChapter.get(m.chapterId);
    if (!chMap) {
      chMap = new Map();
      movesByParentByChapter.set(m.chapterId, chMap);
    }
    const arr = chMap.get(m.parentPositionId) ?? [];
    arr.push(m);
    chMap.set(m.parentPositionId, arr);
  }
  for (const chMap of movesByParentByChapter.values()) {
    for (const arr of chMap.values()) {
      arr.sort((a, b) => Number(b.isMainLine) - Number(a.isMainLine) || a.sortOrder - b.sortOrder);
    }
  }

  const now = new Date();
  const allExtracted: TrainingLine[] = [];
  let totalLines = 0;
  let dueLines = 0;
  let newLinesCount = 0;

  for (const [chapterId, movesByParent] of movesByParentByChapter) {
    const chapter = chapById.get(chapterId);
    if (!chapter) continue;
    const course = courseById.get(chapter.courseId);
    if (!course) continue;

    const chapterLines: LineStep[][] = [];

    function dfs(posId: string, path: LineStep[]) {
      const children = movesByParent.get(posId);
      if (!children || children.length === 0) {
        if (path.length > 0) chapterLines.push([...path]);
        return;
      }
      for (const m of children) {
        const parentPos = posById.get(m.parentPositionId);
        const childPos = posById.get(m.childPositionId);
        const card = m.moveType === 'repertoire' ? cardByMoveId.get(m.id) : null;

        path.push({
          san: m.san,
          uci: m.uci,
          parentFen: parentPos?.fen ?? '',
          childFen: childPos?.fen ?? '',
          moveNumber: m.moveNumber,
          isUserMove: m.moveType === 'repertoire',
          annotation: childPos?.annotation ?? null,
          cardId: card?.id ?? null,
          isNew: card ? card.state === 0 : false,
        });
        dfs(m.childPositionId, path);
        path.pop();
      }
    }

    dfs(rootPos.id, []);

    for (const [i, steps] of chapterLines.entries()) {
      if (!steps.some((s) => s.isUserMove)) continue;

      const lineIsNew = steps.some((s) => s.isNew);
      const lineDueCount = steps.filter((s) => {
        if (!s.cardId) return false;
        const card = allCards.find((c) => c.id === s.cardId);
        return card && card.due! <= now;
      }).length;

      totalLines++;
      if (lineIsNew) newLinesCount++;
      if (lineDueCount > 0 || lineIsNew) dueLines++;

      if (lineDueCount === 0 && !lineIsNew) continue;

      allExtracted.push({
        lineId: `${chapterId}-${i}`,
        courseName: course.name,
        courseColor: course.color as 'white' | 'black',
        chapterName: chapter.name,
        steps,
        isNew: lineIsNew,
        dueCount: lineDueCount,
      });
    }
  }

  // Sort: due non-new first, then new
  allExtracted.sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
    return b.dueCount - a.dueCount;
  });

  // Limit new lines
  let newSeen = 0;
  const limited = allExtracted.filter((line) => {
    if (!line.isNew) return true;
    newSeen++;
    return newSeen <= newLineLimit;
  });

  return { lines: limited, totalLines, dueLines, newLines: newLinesCount };
}
