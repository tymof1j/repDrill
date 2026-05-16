'use server';

import { redirect } from 'next/navigation';
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { fetchLichessGames } from '@/lib/games/lichess';
import { fetchChessComGames } from '@/lib/games/chesscom';
import { detectDeviation } from '@/lib/games/deviation';
import type { GameSource } from '@/lib/games/types';
import type { UserBook } from '@/lib/games/deviation';
import { Chess } from 'chess.js';
import { parsePgn } from '@/lib/chess/pgn-parser';
import { buildTree } from '@/lib/chess/tree';

export type GameAnalysisRow = {
  id?: string;
  source: GameSource;
  gameId: string;
  url?: string;
  whiteUsername: string;
  blackUsername: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  playedAt: string; // ISO
  opening?: string;
  timeControl?: string;
  pgn: string;
  /** Deviation summary inline. */
  deviation: {
    kind: 'in_book' | 'left_book' | 'no_repertoire_for_color' | 'parse_error';
    playedAs: 'white' | 'black';
    deviationMoveNumber?: number;
    deviationPly?: number;
    playedSan?: string;
    expectedSans?: string[];
    deviationFen?: string;
    deviationPositionId?: string;
    totalPlies: number;
  };
};

export type AnalyzeBatchResult = {
  rows: GameAnalysisRow[];
  totals: {
    inBook: number;
    leftBook: number;
    noRepertoire: number;
    parseError: number;
  };
  topDeviations: { fen: string; moveNumber?: number; played?: string; count: number }[];
};

function summarizeRows(rows: GameAnalysisRow[]): AnalyzeBatchResult {
  const totals = { inBook: 0, leftBook: 0, noRepertoire: 0, parseError: 0 };
  const deviationCounts = new Map<
    string,
    { fen: string; moveNumber?: number; played?: string; count: number }
  >();

  for (const row of rows) {
    if (row.deviation.kind === 'in_book') totals.inBook++;
    else if (row.deviation.kind === 'left_book') totals.leftBook++;
    else if (row.deviation.kind === 'no_repertoire_for_color') totals.noRepertoire++;
    else totals.parseError++;

    if (row.deviation.kind === 'left_book' && row.deviation.deviationFen) {
      const key = `${row.deviation.deviationFen}::${row.deviation.playedSan ?? ''}`;
      const existing = deviationCounts.get(key);
      if (existing) existing.count++;
      else {
        deviationCounts.set(key, {
          fen: row.deviation.deviationFen,
          moveNumber: row.deviation.deviationMoveNumber,
          played: row.deviation.playedSan,
          count: 1,
        });
      }
    }
  }

  const topDeviations = Array.from(deviationCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { rows, totals, topDeviations };
}

async function requireToken() {
  const token = await convexAuthNextjsToken();
  if (!token) redirect('/login');
  return token;
}

/** Build user book from Convex data */
async function loadUserBookFromConvex(token: string): Promise<UserBook> {
  const courses = await fetchQuery(api.courses.list, {}, { token });
  if (courses.length === 0) return { white: new Map(), black: new Map() };

  const book: UserBook = { white: new Map(), black: new Map() };

  for (const course of courses) {
    const chapters = await fetchQuery(api.courses.listChapters, { courseId: course._id }, { token });

    // For each chapter, we need moves and positions
    // We'll use the getCourseTree which fetches everything at once
    // But that's a mutation, not a query... Let me build the book from individual queries
    for (const chapter of chapters) {
      // We need to get moves for this chapter - but we don't have a direct query for that
      // Let's use the course tree query approach
    }
  }

  // Actually, let's build the book by getting all course data through the import function
  // This is a temporary workaround - ideally we'd have a dedicated query
  // For now, the analysis feature will be limited until we have proper Convex queries
  
  return book;
}

export async function analyzeRecentGames(formData: FormData): Promise<AnalyzeBatchResult> {
  const token = await requireToken();
  const source = String(formData.get('source') ?? 'lichess') as GameSource;
  const limit = Math.min(50, Math.max(1, parseInt(String(formData.get('limit') ?? '10'), 10) || 10));

  const user = await fetchQuery(api.users.current, {}, { token });
  if (!user) throw new Error('User not found');

  const username =
    source === 'lichess' ? user.lichessUsername : user.chesscomUsername;
  if (!username) {
    throw new Error(
      `No ${source === 'lichess' ? 'Lichess' : 'Chess.com'} username on file. Add one in Settings.`,
    );
  }

  const games =
    source === 'lichess'
      ? await fetchLichessGames(username, limit)
      : await fetchChessComGames(username, limit);

  // TODO: Build user book from Convex data for deviation detection
  // For now, return games without deviation analysis
  const book: UserBook = { white: new Map(), black: new Map() };

  const rows: GameAnalysisRow[] = [];
  const totals = { inBook: 0, leftBook: 0, noRepertoire: 0, parseError: 0 };
  const deviationCounts = new Map<
    string,
    { fen: string; moveNumber?: number; played?: string; count: number }
  >();

  for (const game of games) {
    const dev = detectDeviation(
      game.pgn,
      book,
      username.toLowerCase(),
      game.whiteUsername,
      game.blackUsername,
    );

    if (dev.kind === 'in_book') totals.inBook++;
    else if (dev.kind === 'left_book') totals.leftBook++;
    else if (dev.kind === 'no_repertoire_for_color') totals.noRepertoire++;
    else totals.parseError++;

    if (dev.kind === 'left_book' && dev.deviationFen) {
      const key = `${dev.deviationFen}::${dev.playedSan ?? ''}`;
      const existing = deviationCounts.get(key);
      if (existing) existing.count++;
      else
        deviationCounts.set(key, {
          fen: dev.deviationFen,
          moveNumber: dev.deviationMoveNumber,
          played: dev.playedSan,
          count: 1,
        });
    }

    rows.push({
      source: game.source,
      gameId: game.gameId,
      url: game.url,
      whiteUsername: game.whiteUsername,
      blackUsername: game.blackUsername,
      result: game.result,
      playedAt: game.playedAt.toISOString(),
      opening: game.opening,
      timeControl: game.timeControl,
      pgn: game.pgn,
      deviation: {
        kind: dev.kind,
        playedAs: dev.playedAs,
        deviationMoveNumber: dev.deviationMoveNumber,
        deviationPly: dev.deviationPly,
        playedSan: dev.playedSan,
        expectedSans: dev.expectedSans,
        deviationFen: dev.deviationFen,
        deviationPositionId: dev.deviationPositionId,
        totalPlies: dev.totalPlies,
      },
    });
  }

  const topDeviations = Array.from(deviationCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  try {
    const stored = await fetchMutation(
      api.analyze.storeSync,
      {
        source,
        rows: rows.map((row) => ({
          gameId: row.gameId,
          url: row.url,
          whiteUsername: row.whiteUsername,
          blackUsername: row.blackUsername,
          result: row.result,
          playedAt: new Date(row.playedAt).getTime(),
          opening: row.opening,
          timeControl: row.timeControl,
          pgn: row.pgn,
          playedAs: row.deviation.playedAs,
          deviationKind: row.deviation.kind,
          deviationMoveNumber: row.deviation.deviationMoveNumber,
          deviationPly: row.deviation.deviationPly,
          playedSan: row.deviation.playedSan,
          expectedSans: row.deviation.expectedSans,
          deviationFen: row.deviation.deviationFen,
          totalPlies: row.deviation.totalPlies,
        })),
      },
      { token },
    );
    const idsByGameId = new Map(stored.rows.map((row) => [row.gameId, row.id]));
    for (const row of rows) {
      row.id = idsByGameId.get(row.gameId);
    }
  } catch {
    // Keep analyze flow functional even if Convex analyze functions are not deployed yet.
  }

  return { rows, totals, topDeviations };
}

export async function loadCachedAnalyze(
  source: GameSource,
  limit: number,
): Promise<{ result: AnalyzeBatchResult; lastSyncedAt: number | null } | null> {
  const token = await requireToken();
  try {
    const cached = await fetchQuery(api.analyze.getCached, { source, limit }, { token });
    if (!cached || cached.rows.length === 0) return null;
    const rows: GameAnalysisRow[] = cached.rows.map((row) => ({
      id: row._id,
      source: row.source,
      gameId: row.gameId,
      url: row.url,
      whiteUsername: row.whiteUsername,
      blackUsername: row.blackUsername,
      result: row.result,
      playedAt: new Date(row.playedAt).toISOString(),
      opening: row.opening,
      timeControl: row.timeControl,
      pgn: row.pgn,
      deviation: {
        kind: row.deviationKind,
        playedAs: row.playedAs,
        deviationMoveNumber: row.deviationMoveNumber,
        deviationPly: row.deviationPly,
        playedSan: row.playedSan,
        expectedSans: row.expectedSans,
        deviationFen: row.deviationFen,
        totalPlies: row.totalPlies,
      },
    }));
    return {
      result: summarizeRows(rows),
      lastSyncedAt: cached.lastSyncedAt ?? null,
    };
  } catch {
    return null;
  }
}

/** Re-detect deviation for a single PGN */
export async function getGameDeviationDetail(formData: FormData): Promise<{
  pgn: string;
  plies: { san: string; uci: string; fenAfter: string; fenBefore: string }[];
  deviationPly?: number;
  expectedSans?: string[];
  playedAs: 'white' | 'black';
}> {
  await requireToken();
  const pgn = String(formData.get('pgn') ?? '');
  const usernameLower = String(formData.get('username') ?? '').toLowerCase();
  const whiteUsername = String(formData.get('white') ?? '');
  const blackUsername = String(formData.get('black') ?? '');

  // TODO: Load actual user book from Convex
  const book: UserBook = { white: new Map(), black: new Map() };
  const dev = detectDeviation(pgn, book, usernameLower, whiteUsername, blackUsername);
  const fallbackPlies =
    dev.plies.length > 0
      ? dev.plies
      : (() => {
          try {
            const chess = new Chess();
            chess.loadPgn(pgn, { strict: false });
            const verbose = chess.history({ verbose: true });
            return verbose.map((m) => ({
              san: m.san,
              uci: `${m.from}${m.to}${m.promotion ?? ''}`,
              fenBefore: m.before.split(' ').slice(0, 4).join(' '),
              fenAfter: m.after.split(' ').slice(0, 4).join(' '),
            }));
          } catch {
            return [];
          }
        })();
  return {
    pgn,
    plies: fallbackPlies,
    deviationPly: dev.deviationPly,
    expectedSans: dev.expectedSans,
    playedAs: dev.playedAs,
  };
}

export async function ensureAnalyzedGameStored(formData: FormData): Promise<{ id: string }> {
  const token = await requireToken();
  const source = String(formData.get('source') ?? '') as GameSource;
  if (source !== 'lichess' && source !== 'chesscom') throw new Error('Invalid source');
  const result = await fetchMutation(
    api.analyze.storeOne,
    {
      source,
      gameId: String(formData.get('gameId') ?? ''),
      url: String(formData.get('url') ?? '') || undefined,
      whiteUsername: String(formData.get('whiteUsername') ?? ''),
      blackUsername: String(formData.get('blackUsername') ?? ''),
      result: String(formData.get('result') ?? '*') as '1-0' | '0-1' | '1/2-1/2' | '*',
      playedAt: Number(formData.get('playedAt') ?? Date.now()),
      opening: String(formData.get('opening') ?? '') || undefined,
      timeControl: String(formData.get('timeControl') ?? '') || undefined,
      pgn: String(formData.get('pgn') ?? ''),
      playedAs: String(formData.get('playedAs') ?? 'white') as 'white' | 'black',
      deviationKind: String(formData.get('deviationKind') ?? 'parse_error') as GameAnalysisRow['deviation']['kind'],
      deviationMoveNumber: Number(formData.get('deviationMoveNumber') || '') || undefined,
      deviationPly: Number(formData.get('deviationPly') || '') || undefined,
      playedSan: String(formData.get('playedSan') ?? '') || undefined,
      expectedSans: String(formData.get('expectedSans') ?? '')
        ? String(formData.get('expectedSans')).split('\n')
        : undefined,
      deviationFen: String(formData.get('deviationFen') ?? '') || undefined,
      totalPlies: Number(formData.get('totalPlies') ?? 0),
    },
    { token },
  );
  return { id: result.id };
}

export async function importAnalyzedGameToCourse(formData: FormData): Promise<{ courseId: string; chapterName: string }> {
  const token = await requireToken();
  const pgn = String(formData.get('pgn') ?? '').trim();
  const playedAs = String(formData.get('playedAs') ?? 'white') as 'white' | 'black';
  const chapterNameInput = String(formData.get('chapterName') ?? '').trim();
  const annotationsRaw = String(formData.get('annotationsByPly') ?? '{}');

  if (!pgn) throw new Error('Missing PGN');

  const games = parsePgn(pgn);
  if (games.length === 0) throw new Error('Could not parse game PGN');
  const game = games[0];

  const defaultChapterName =
    chapterNameInput ||
    game.headers.Event ||
    `${game.headers.White ?? 'White'} vs ${game.headers.Black ?? 'Black'}`;

  const courses = await fetchQuery(api.courses.list, {}, { token });
  let targetCourse: Awaited<ReturnType<typeof fetchQuery<typeof api.courses.get>>> =
    courses.find((c) => c.name.trim().toLowerCase() === 'game analysis') ?? null;
  if (!targetCourse) {
    const created = await fetchMutation(
      api.courses.create,
      {
        name: 'Game analysis',
        color: playedAs,
        description: 'Auto-imported games from Analyze tab',
      },
      { token },
    );
    targetCourse = await fetchQuery(api.courses.get, { id: created }, { token });
  }
  if (!targetCourse) throw new Error('Could not create or load Game analysis course');

  const chapterCount = (await fetchQuery(api.courses.listChapters, { courseId: targetCourse._id }, { token })).length;
  const tree = buildTree(game);

  // Attach per-position annotations gathered in Analyze viewer.
  try {
    const parsed = JSON.parse(annotationsRaw) as Record<string, string>;
    for (const [k, text] of Object.entries(parsed)) {
      const ply = Number(k);
      if (!Number.isFinite(ply) || ply <= 0 || ply > tree.moves.length) continue;
      if (typeof text !== 'string' || !text.trim()) continue;
      const idx = ply - 1;
      const existing = tree.moves[idx]?.comment?.trim();
      tree.moves[idx].comment = existing ? `${existing}\n\n${text.trim()}` : text.trim();
    }
  } catch {
    // ignore malformed local annotation payload
  }

  await fetchMutation(
    api.import.importTreeIntoChapter,
    {
      courseId: targetCourse._id,
      chapterName: defaultChapterName,
      sortOrder: chapterCount,
      courseColor: targetCourse.color,
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
    { token },
  );

  return { courseId: targetCourse._id, chapterName: defaultChapterName };
}
