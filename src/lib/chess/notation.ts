import { Chess } from 'chess.js';

/**
 * Normalizes chess move notation to something chess.js can handle.
 * Specifically, it handles "Short Notation" as defined in docs/notation-spec.md:
 * - Omits 'x', '+', '#'
 * - For pawn captures, use only origin and destination files (e.g. 'gf')
 * - Strips extra symbols like '!' or '?'
 */
export function normalizeNotation(input: string, fen: string): string {
  let move = input.trim();

  // 1. Basic cleaning: remove common annotation symbols and whitespace
  move = move.replace(/[+#x!?]/g, '');

  if (!move) return move;

  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });

  // 2. Handle pawn capture short form: 'gf' (file-to-file)
  // If it's a 2-character string like 'gf', it might be a pawn capture.
  if (move.length === 2 && /^[a-h][a-h]$/.test(move)) {
    const fromFile = move[0];
    const toFile = move[1];

    // Find a pawn move from fromFile that captures to toFile
    const match = legalMoves.find((m) => {
      if (m.piece !== 'p') return false;
      const mFromFile = m.from[0];
      const mToFile = m.to[0];
      return mFromFile === fromFile && mToFile === toFile;
    });

    if (match) {
      return match.san;
    }
  }

  // 3. Handle piece move short form: 'Nf3' (instead of Nf3+, etc - already stripped)
  // Or 'Rb7' (instead of Rxb7+)
  // We try to match the stripped input against legal moves.
  // We need to compare carefully because 'd4' could be a pawn move or 'Nd4' stripped.
  
  // Try to find a legal move whose SAN (stripped) matches our move (stripped)
  const matches = legalMoves.filter((m) => {
    const cleanSan = m.san.replace(/[+#x]/g, '');
    return cleanSan === move;
  });

  if (matches.length === 1) {
    return matches[0].san;
  }

  // If multiple matches, it's ambiguous or invalid. 
  // Return the original (stripped) and let chess.js handle it or fail.
  return move;
}
