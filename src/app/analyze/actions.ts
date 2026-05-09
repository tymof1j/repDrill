'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { fetchLichessGames } from '@/lib/games/lichess';
import { fetchChessComGames } from '@/lib/games/chesscom';
import { detectDeviation, loadUserBook } from '@/lib/games/deviation';
import { getUser } from '@/lib/user/queries';
import type { GameSource } from '@/lib/games/types';

export type GameAnalysisRow = {
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

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user.id;
}

export async function analyzeRecentGames(formData: FormData): Promise<AnalyzeBatchResult> {
  const userId = await requireUserId();
  const source = String(formData.get('source') ?? 'lichess') as GameSource;
  const limit = Math.min(50, Math.max(1, parseInt(String(formData.get('limit') ?? '10'), 10) || 10));

  const user = await getUser(userId);
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

  const book = await loadUserBook(userId);

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

  return { rows, totals, topDeviations };
}

/** Re-detect deviation for a single PGN (used to expand a game into the deviation viewer). */
export async function getGameDeviationDetail(formData: FormData): Promise<{
  pgn: string;
  plies: { san: string; uci: string; fenAfter: string; fenBefore: string }[];
  deviationPly?: number;
  expectedSans?: string[];
  playedAs: 'white' | 'black';
}> {
  const userId = await requireUserId();
  const pgn = String(formData.get('pgn') ?? '');
  const usernameLower = String(formData.get('username') ?? '').toLowerCase();
  const whiteUsername = String(formData.get('white') ?? '');
  const blackUsername = String(formData.get('black') ?? '');

  const book = await loadUserBook(userId);
  const dev = detectDeviation(pgn, book, usernameLower, whiteUsername, blackUsername);
  return {
    pgn,
    plies: dev.plies,
    deviationPly: dev.deviationPly,
    expectedSans: dev.expectedSans,
    playedAs: dev.playedAs,
  };
}
