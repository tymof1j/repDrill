import { Chess } from 'chess.js';
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
