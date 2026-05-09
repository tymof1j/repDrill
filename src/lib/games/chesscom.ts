import 'server-only';
import type { FetchedGame } from './types';

const BASE = 'https://api.chess.com/pub';
const UA = 'RepDrill/0.1 (+https://github.com/tymof1j/repDrill)';

type ArchivesResponse = { archives: string[] };

type ChessComGame = {
  url?: string;
  pgn?: string;
  time_control?: string;
  end_time?: number;
  rated?: boolean;
  rules?: string;
  white: { username: string; result: string };
  black: { username: string; result: string };
  uuid?: string;
};

type ArchiveResponse = { games: ChessComGame[] };

/** Two-step: get archives → fetch most recent month(s) until we have `max` games. */
export async function fetchChessComGames(
  username: string,
  max = 25,
): Promise<FetchedGame[]> {
  const archivesRes = await fetch(`${BASE}/player/${encodeURIComponent(username.toLowerCase())}/games/archives`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!archivesRes.ok) {
    throw new Error(`Chess.com archives error: ${archivesRes.status} ${archivesRes.statusText}`);
  }
  const archives: ArchivesResponse = await archivesRes.json();

  const out: FetchedGame[] = [];
  for (let i = archives.archives.length - 1; i >= 0 && out.length < max; i--) {
    const monthRes = await fetch(archives.archives[i], {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!monthRes.ok) continue;
    const month: ArchiveResponse = await monthRes.json();
    const sorted = [...month.games].sort(
      (a, b) => (b.end_time ?? 0) - (a.end_time ?? 0),
    );
    for (const g of sorted) {
      if (!g.pgn) continue;
      out.push(toFetched(g));
      if (out.length >= max) break;
    }
  }

  return out;
}

function toFetched(g: ChessComGame): FetchedGame {
  const id = g.uuid ?? g.url?.split('/').pop() ?? cryptoLikeId();
  const playedAt = g.end_time ? new Date(g.end_time * 1000) : new Date();
  const result = chessComResult(g.white.result, g.black.result);
  return {
    source: 'chesscom',
    gameId: id,
    pgn: g.pgn ?? '',
    whiteUsername: g.white.username,
    blackUsername: g.black.username,
    result,
    playedAt,
    timeControl: g.time_control,
    url: g.url,
  };
}

function chessComResult(white: string, black: string): FetchedGame['result'] {
  if (white === 'win') return '1-0';
  if (black === 'win') return '0-1';
  const draws = new Set([
    'agreed', 'repetition', 'stalemate', 'insufficient',
    'timevsinsufficient', '50move',
  ]);
  if (draws.has(white) || draws.has(black)) return '1/2-1/2';
  return '*';
}

function cryptoLikeId(): string {
  return Math.random().toString(36).slice(2, 14);
}
