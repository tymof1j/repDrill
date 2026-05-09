import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  courses,
  chapters,
  positions,
  moves,
  reviewCards,
  reviewLogs,
} from '@/lib/db/schema';

const STARTING_FEN_NORMALIZED =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

/* ─── PGN export ─────────────────────────────────────────────────── */

/** Generate PGN text for a single chapter, with variations. */
async function pgnForChapter(
  chapterId: string,
  chapterName: string,
  courseColor: 'white' | 'black',
): Promise<string> {
  const moveRows = await db.select().from(moves).where(eq(moves.chapterId, chapterId));
  if (moveRows.length === 0) {
    return `[Event "${escapeHeader(chapterName)}"]\n[Result "*"]\n\n*\n`;
  }

  const positionIds = new Set<string>();
  for (const m of moveRows) {
    positionIds.add(m.parentPositionId);
    positionIds.add(m.childPositionId);
  }
  const posRows = await db
    .select()
    .from(positions)
    .where(inArray(positions.id, Array.from(positionIds)));
  const posById = new Map(posRows.map((p) => [p.id, p]));

  const root = posRows.find((p) => p.fen === STARTING_FEN_NORMALIZED);
  if (!root) {
    return `[Event "${escapeHeader(chapterName)}"]\n[Result "*"]\n\n*\n`;
  }

  const byParent = new Map<string, typeof moveRows>();
  for (const m of moveRows) {
    const arr = byParent.get(m.parentPositionId) ?? [];
    arr.push(m);
    byParent.set(m.parentPositionId, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => Number(b.isMainLine) - Number(a.isMainLine) || a.sortOrder - b.sortOrder);
  }

  function writeLine(positionId: string, isFirstMove: boolean): string {
    const children = byParent.get(positionId) ?? [];
    if (children.length === 0) return '';
    const [main, ...alts] = children;
    let out = '';
    out += renderMoveToken(main, isFirstMove);
    const childPos = posById.get(main.childPositionId);
    if (childPos?.annotation) {
      out += ` {${childPos.annotation.replace(/[{}]/g, '')}}`;
    }
    for (const alt of alts) {
      out += ' (' + renderMoveToken(alt, true);
      const altChild = posById.get(alt.childPositionId);
      if (altChild?.annotation) {
        out += ` {${altChild.annotation.replace(/[{}]/g, '')}}`;
      }
      const tail = writeLine(alt.childPositionId, false);
      if (tail) out += ' ' + tail;
      out += ')';
    }
    const tail = writeLine(main.childPositionId, false);
    if (tail) out += ' ' + tail;
    return out;
  }

  const body = writeLine(root.id, true);

  const headers =
    `[Event "${escapeHeader(chapterName)}"]\n` +
    `[ChapterName "${escapeHeader(chapterName)}"]\n` +
    `[Color "${courseColor}"]\n` +
    `[Result "*"]\n`;

  return `${headers}\n${body} *\n`;
}

function renderMoveToken(
  m: { san: string; moveNumber: number; colorToMove: 'white' | 'black' },
  forceNumber: boolean,
): string {
  // colorToMove is the side to move AFTER this move, so the side that just moved is the opposite.
  const justMoved = m.colorToMove === 'white' ? 'black' : 'white';
  if (justMoved === 'white') return `${m.moveNumber}. ${m.san}`;
  if (forceNumber) return `${m.moveNumber}... ${m.san}`;
  return m.san;
}

function escapeHeader(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function exportCourseAsPgn(userId: string, courseId: string): Promise<string> {
  const courseRows = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
    .limit(1);
  const course = courseRows[0];
  if (!course) throw new Error('Course not found');

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.courseId, courseId))
    .orderBy(chapters.sortOrder, chapters.createdAt);

  const blocks: string[] = [];
  for (const ch of chapterRows) {
    blocks.push(await pgnForChapter(ch.id, ch.name, course.color as 'white' | 'black'));
  }

  return blocks.join('\n\n');
}

export async function exportChapterAsPgn(
  userId: string,
  chapterId: string,
): Promise<string> {
  const chRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  const ch = chRows[0];
  if (!ch) throw new Error('Chapter not found');
  const courseRows = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, ch.courseId), eq(courses.userId, userId)))
    .limit(1);
  const course = courseRows[0];
  if (!course) throw new Error('Course not found');

  return pgnForChapter(ch.id, ch.name, course.color as 'white' | 'black');
}

/* ─── JSON export ────────────────────────────────────────────────── */

export type ExportBundle = {
  version: 1;
  exportedAt: string;
  courses: Array<{
    id: string;
    name: string;
    color: 'white' | 'black';
    description: string | null;
    chapters: Array<{
      id: string;
      name: string;
      sortOrder: number;
      description: string | null;
      moves: Array<{
        id: string;
        parentFen: string;
        childFen: string;
        san: string;
        uci: string;
        moveNumber: number;
        colorToMove: 'white' | 'black';
        isMainLine: boolean;
        moveType: 'repertoire' | 'opponent' | 'alternative';
        sortOrder: number;
      }>;
    }>;
  }>;
  positions: Array<{ fen: string; annotation: string | null }>;
  reviewState: Array<{
    moveSan: string;
    parentFen: string;
    childFen: string;
    due: string;
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    reps: number;
    lapses: number;
    state: number;
    lastReview: string | null;
  }>;
  reviewLogs: Array<{
    cardKey: string;
    rating: number;
    responseTimeMs: number | null;
    reviewedAt: string;
    prevStability: number | null;
    prevDifficulty: number | null;
    prevState: number | null;
  }>;
};

export async function exportFullBundle(userId: string): Promise<ExportBundle> {
  const userCourses = await db.select().from(courses).where(eq(courses.userId, userId));
  const courseIds = userCourses.map((c) => c.id);
  const allChapters =
    courseIds.length === 0
      ? []
      : await db.select().from(chapters).where(inArray(chapters.courseId, courseIds));
  const chapterIds = allChapters.map((c) => c.id);
  const allMoves =
    chapterIds.length === 0
      ? []
      : await db.select().from(moves).where(inArray(moves.chapterId, chapterIds));

  const allPositions = await db
    .select()
    .from(positions)
    .where(eq(positions.userId, userId));
  const fenById = new Map(allPositions.map((p) => [p.id, p.fen]));

  const allCards = await db
    .select()
    .from(reviewCards)
    .where(eq(reviewCards.userId, userId));
  const cardById = new Map(allCards.map((c) => [c.id, c]));
  const cardIds = allCards.map((c) => c.id);
  const allLogs =
    cardIds.length === 0
      ? []
      : await db.select().from(reviewLogs).where(inArray(reviewLogs.cardId, cardIds));

  const moveById = new Map(allMoves.map((m) => [m.id, m]));

  const bundle: ExportBundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    courses: userCourses.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color as 'white' | 'black',
      description: c.description,
      chapters: allChapters
        .filter((ch) => ch.courseId === c.id)
        .map((ch) => ({
          id: ch.id,
          name: ch.name,
          sortOrder: ch.sortOrder,
          description: ch.description,
          moves: allMoves
            .filter((m) => m.chapterId === ch.id)
            .map((m) => ({
              id: m.id,
              parentFen: fenById.get(m.parentPositionId) ?? '',
              childFen: fenById.get(m.childPositionId) ?? '',
              san: m.san,
              uci: m.uci,
              moveNumber: m.moveNumber,
              colorToMove: m.colorToMove as 'white' | 'black',
              isMainLine: m.isMainLine,
              moveType: m.moveType as 'repertoire' | 'opponent' | 'alternative',
              sortOrder: m.sortOrder,
            })),
        })),
    })),
    positions: allPositions.map((p) => ({ fen: p.fen, annotation: p.annotation })),
    reviewState: allCards.map((c) => {
      const m = moveById.get(c.moveId);
      return {
        moveSan: m?.san ?? '',
        parentFen: m ? (fenById.get(m.parentPositionId) ?? '') : '',
        childFen: m ? (fenById.get(m.childPositionId) ?? '') : '',
        due: c.due.toISOString(),
        stability: c.stability,
        difficulty: c.difficulty,
        elapsedDays: c.elapsedDays,
        scheduledDays: c.scheduledDays,
        reps: c.reps,
        lapses: c.lapses,
        state: c.state,
        lastReview: c.lastReview ? c.lastReview.toISOString() : null,
      };
    }),
    reviewLogs: allLogs.map((l) => {
      const card = cardById.get(l.cardId);
      const m = card ? moveById.get(card.moveId) : null;
      const cardKey = m
        ? `${fenById.get(m.parentPositionId) ?? ''}::${m.san}`
        : l.cardId;
      return {
        cardKey,
        rating: l.rating,
        responseTimeMs: l.responseTimeMs,
        reviewedAt: l.reviewedAt.toISOString(),
        prevStability: l.prevStability,
        prevDifficulty: l.prevDifficulty,
        prevState: l.prevState,
      };
    }),
  };

  return bundle;
}

/* ─── Review log CSV ─────────────────────────────────────────────── */

export async function exportReviewLogsCsv(userId: string): Promise<string> {
  const allCards = await db
    .select()
    .from(reviewCards)
    .where(eq(reviewCards.userId, userId));
  const cardIds = allCards.map((c) => c.id);
  if (cardIds.length === 0) {
    return 'reviewedAt,cardId,rating,responseTimeMs,prevStability,prevDifficulty,prevState\n';
  }
  const allLogs = await db
    .select()
    .from(reviewLogs)
    .where(inArray(reviewLogs.cardId, cardIds));

  const header =
    'reviewedAt,cardId,rating,responseTimeMs,prevStability,prevDifficulty,prevState\n';
  const rows = allLogs
    .map((l) =>
      [
        l.reviewedAt.toISOString(),
        l.cardId,
        l.rating,
        l.responseTimeMs ?? '',
        l.prevStability ?? '',
        l.prevDifficulty ?? '',
        l.prevState ?? '',
      ].join(','),
    )
    .join('\n');
  return header + rows + (rows ? '\n' : '');
}
