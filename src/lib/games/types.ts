export type GameSource = 'lichess' | 'chesscom';

export type FetchedGame = {
  source: GameSource;
  gameId: string;
  pgn: string;
  whiteUsername: string;
  blackUsername: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  playedAt: Date;
  opening?: string;
  timeControl?: string;
  url?: string;
};
