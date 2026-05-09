import 'server-only';
import type { FetchedGame } from './types';
import { parsePgn } from '@/lib/chess/pgn-parser';

const BASE = 'https://lichess.org/api';

/** Fetch the most recent N games for a Lichess user as PGN, then split into structured games.
 *  Public endpoint, no auth required. */
export async function fetchLichessGames(
  username: string,
  max = 25,
): Promise<FetchedGame[]> {
  const url = new URL(`${BASE}/games/user/${encodeURIComponent(username)}`);
  url.searchParams.set('max', String(max));
  url.searchParams.set('moves', 'true');
  url.searchParams.set('opening', 'true');
  url.searchParams.set('clocks', 'false');
  url.searchParams.set('evals', 'false');
  url.searchParams.set('literate', 'false');
  url.searchParams.set('pgnInJson', 'false');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/x-chess-pgn' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Lichess API error: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  if (!text.trim()) return [];

  const games = parsePgn(text);
  const split = splitPgnByGame(text);

  return games.map((g, i) => {
    const result = (g.headers.Result as FetchedGame['result']) ?? '*';
    const dateStr = g.headers.UTCDate ?? g.headers.Date;
    const timeStr = g.headers.UTCTime;
    const playedAt = parseDate(dateStr, timeStr);
    const id = g.headers.Site?.split('/').pop() ?? `lichess-${i}`;
    return {
      source: 'lichess',
      gameId: id,
      pgn: split[i] ?? '',
      whiteUsername: g.headers.White ?? '?',
      blackUsername: g.headers.Black ?? '?',
      result,
      playedAt,
      opening: g.headers.Opening,
      timeControl: g.headers.TimeControl,
      url: g.headers.Site,
    };
  });
}

function parseDate(dateStr?: string, timeStr?: string): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('.').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date();
  if (timeStr) {
    const [hh, mm, ss] = timeStr.split(':').map((n) => parseInt(n, 10));
    return new Date(Date.UTC(y, m - 1, d, hh ?? 0, mm ?? 0, ss ?? 0));
  }
  return new Date(Date.UTC(y, m - 1, d));
}

/** Split a multi-game PGN file into raw per-game text blocks while preserving headers + movetext. */
function splitPgnByGame(pgn: string): string[] {
  const lines = pgn.replace(/\r\n/g, '\n').split('\n');
  const games: string[] = [];
  let current: string[] = [];
  let inHeaders = false;

  for (const line of lines) {
    if (line.startsWith('[Event ')) {
      if (current.length > 0 && current.some((l) => !l.startsWith('['))) {
        games.push(current.join('\n').trim());
        current = [];
      }
      inHeaders = true;
    } else if (inHeaders && line.trim() === '') {
      inHeaders = false;
    }
    current.push(line);
  }
  if (current.length > 0) {
    const text = current.join('\n').trim();
    if (text) games.push(text);
  }
  return games;
}
