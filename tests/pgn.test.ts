import { expect, it } from 'vitest';
import { parsePgn } from '../src/lib/chess/pgn-parser';
import { buildTree } from '../src/lib/chess/tree';
it('retains prose brackets, escaped headers and drawings across games', () => {
  const games = parsePgn('[Event "Study \\"A\\""]\n1. e4 {See [Diagram 1] [%cal Ge2e4]} e5 *\n[Event "Next"]\n1. d4 d5 *');
  expect(games).toHaveLength(2);
  expect(games[0].headers.Event).toBe('Study "A"');
  expect(games[0].moves[0].comment).toBe('See [Diagram 1]');
  expect(buildTree(games[0]).moves).toHaveLength(2);
});
it('imports multiple games without headers instead of silently dropping later games', () => {
  expect(parsePgn('1. e4 e5 *\n1. d4 d5 *').map(game => game.moves[0].san)).toEqual(['e4', 'd4']);
});
it('rejects malformed headers, comments and variations instead of hanging or truncating', () => {
  for (const text of ['[Event "broken"', '1. e4 {unfinished', '1. e4 (1. d4 d5', '1. e4 ) e5']) expect(() => parsePgn(text)).toThrow();
});
