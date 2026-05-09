/** Two positions are "the same" if pieces, side to move, castling, and en passant match.
 *  Strip halfmove clock and fullmove number so transpositions dedupe. */
export function normalizeFen(fen: string): string {
  const parts = fen.split(' ');
  return parts.slice(0, 4).join(' ');
}
