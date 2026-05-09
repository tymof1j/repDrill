import 'server-only';
import { Chess } from 'chess.js';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courses, chapters, moves, positions } from '@/lib/db/schema';
import { normalizeFen } from '@/lib/chess/fen';
import { parsePgn } from '@/lib/chess/pgn-parser';

export type DeviationKind =
  | 'in_book'
  | 'left_book'
  | 'no_repertoire_for_color'
  | 'parse_error';

export type DeviationResult = {
  kind: DeviationKind;
  playedAs: 'white' | 'black';
  /** 1-based ply number where the user left the book (only when kind = 'left_book'). */
  deviationPly?: number;
  /** Move number (chess sense). */
  deviationMoveNumber?: number;
  /** SAN the user played (the "wrong" move from repertoire's perspective). */
  playedSan?: string;
  /** UCI of the played move. */
  playedUci?: string;
  /** Expected SAN options from repertoire at that position. */
  expectedSans?: string[];
  /** FEN of the position immediately BEFORE the deviation move. */
  deviationFen?: string;
  /** ID of the position node BEFORE the deviation (where repertoire still applied). */
  deviationPositionId?: string;
  /** Total plies in the game. */
  totalPlies: number;
  /** All plies played (SAN + FEN-after) for replay. */
  plies: { san: string; uci: string; fenAfter: string; fenBefore: string }[];
};

/** Build user's repertoire tree once: a Map<color, Map<parentFen, Map<san, { positionId, sans[] }>>>. */
export type UserBook = {
  white: Map<string, { positionId: string; childFen: string; san: string }[]>;
  black: Map<string, { positionId: string; childFen: string; san: string }[]>;
};

export async function loadUserBook(userId: string): Promise<UserBook> {
  const userCourses = await db
    .select({ id: courses.id, color: courses.color })
    .from(courses)
    .where(eq(courses.userId, userId));
  if (userCourses.length === 0) {
    return { white: new Map(), black: new Map() };
  }
  const courseIds = userCourses.map((c) => c.id);
  const chapterRows = await db
    .select({ id: chapters.id, courseId: chapters.courseId })
    .from(chapters)
    .where(inArray(chapters.courseId, courseIds));
  if (chapterRows.length === 0) {
    return { white: new Map(), black: new Map() };
  }

  const courseColorById = new Map<string, 'white' | 'black'>(
    userCourses.map((c) => [c.id, c.color as 'white' | 'black']),
  );
  const chapterColor = new Map<string, 'white' | 'black'>();
  for (const ch of chapterRows) {
    const color = courseColorById.get(ch.courseId);
    if (color) chapterColor.set(ch.id, color);
  }

  const chapterIds = chapterRows.map((c) => c.id);
  const moveRows = await db
    .select()
    .from(moves)
    .where(inArray(moves.chapterId, chapterIds));
  if (moveRows.length === 0) {
    return { white: new Map(), black: new Map() };
  }

  const positionIds = new Set<string>();
  for (const m of moveRows) {
    positionIds.add(m.parentPositionId);
    positionIds.add(m.childPositionId);
  }
  const positionRows = await db
    .select()
    .from(positions)
    .where(inArray(positions.id, Array.from(positionIds)));
  const fenById = new Map<string, string>();
  for (const p of positionRows) fenById.set(p.id, p.fen);

  const book: UserBook = { white: new Map(), black: new Map() };
  for (const m of moveRows) {
    const color = chapterColor.get(m.chapterId);
    if (!color) continue;
    const map = color === 'white' ? book.white : book.black;
    const parentFen = fenById.get(m.parentPositionId);
    const childFen = fenById.get(m.childPositionId);
    if (!parentFen || !childFen) continue;
    const arr = map.get(parentFen) ?? [];
    if (!arr.some((e) => e.san === m.san)) {
      arr.push({ positionId: m.parentPositionId, childFen, san: m.san });
    }
    map.set(parentFen, arr);
  }

  return book;
}

/** Detect where, in `pgn`, the user left their repertoire. */
export function detectDeviation(
  pgn: string,
  book: UserBook,
  ourUsernameLower: string,
  whiteUsername: string,
  blackUsername: string,
): DeviationResult {
  const games = parsePgn(pgn);
  const game = games[0];
  if (!game) {
    return { kind: 'parse_error', playedAs: 'white', totalPlies: 0, plies: [] };
  }

  const playedAs: 'white' | 'black' =
    whiteUsername.toLowerCase() === ourUsernameLower ? 'white' : 'black';

  const colorBook = playedAs === 'white' ? book.white : book.black;
  if (colorBook.size === 0) {
    return {
      kind: 'no_repertoire_for_color',
      playedAs,
      totalPlies: 0,
      plies: [],
    };
  }

  const chess = new Chess();
  const plies: DeviationResult['plies'] = [];
  let deviation: DeviationResult | null = null;

  // Flatten main-line plies only — we follow what the player actually played.
  function flatten(nodes: typeof game.moves): { san: string }[] {
    const out: { san: string }[] = [];
    for (const n of nodes) out.push({ san: n.san });
    return out;
  }

  const flat = flatten(game.moves);
  for (let i = 0; i < flat.length; i++) {
    const ply = flat[i];
    const fenBefore = normalizeFen(chess.fen());
    const sideToMove: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';
    const moveResult = chess.move(ply.san);
    if (!moveResult) {
      // Illegal move in PGN — bail.
      return { kind: 'parse_error', playedAs, totalPlies: plies.length, plies };
    }
    const fenAfter = normalizeFen(chess.fen());
    const uci = moveResult.from + moveResult.to + (moveResult.promotion ?? '');
    plies.push({ san: moveResult.san, uci, fenAfter, fenBefore });

    // Only check user's own moves against the book.
    if (deviation === null && sideToMove === playedAs) {
      const options = colorBook.get(fenBefore);
      if (options && options.length > 0) {
        const matched = options.find((o) => o.san === moveResult.san);
        if (!matched) {
          deviation = {
            kind: 'left_book',
            playedAs,
            deviationPly: i + 1,
            deviationMoveNumber: Math.floor(i / 2) + 1,
            playedSan: moveResult.san,
            playedUci: uci,
            expectedSans: options.map((o) => o.san),
            deviationFen: fenBefore,
            deviationPositionId: options[0].positionId,
            totalPlies: 0,
            plies: [],
          };
        }
      } else if (i === 0 && sideToMove === 'white') {
        // First move out of starting position — repertoire might not cover this.
        // Treat as left-book if no options exist for the root.
        deviation = {
          kind: 'left_book',
          playedAs,
          deviationPly: i + 1,
          deviationMoveNumber: 1,
          playedSan: moveResult.san,
          playedUci: uci,
          expectedSans: [],
          deviationFen: fenBefore,
          totalPlies: 0,
          plies: [],
        };
      }
    }
  }

  if (deviation) {
    return { ...deviation, totalPlies: plies.length, plies };
  }
  return { kind: 'in_book', playedAs, totalPlies: plies.length, plies };
}
