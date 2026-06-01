import { Chess } from 'chess.js';
import { normalizeFen } from './fen';
import type { PgnGame, PgnMoveNode } from './pgn-parser';

/** A position in the imported repertoire tree.
 *  `parentFen` = position before this move; `fen` = position after. */
export type TreeMove = {
  parentFen: string;
  fen: string;
  san: string;
  uci: string;
  moveNumber: number;
  colorToMove: 'white' | 'black'; // color to move AFTER this move
  comment?: string;
  isMainLine: boolean;
};

export type ImportedTree = {
  rootFen: string;
  moves: TreeMove[];
};

export function buildTree(game: PgnGame, startFen?: string): ImportedTree {
  const initial = startFen ? new Chess(startFen) : new Chess();
  const rootFen = normalizeFen(initial.fen());
  const moves: TreeMove[] = [];
  walk(initial, game.moves, moves, true);
  return { rootFen, moves };
}

function walk(chess: Chess, nodes: PgnMoveNode[], out: TreeMove[], onMainLine: boolean) {
  for (const node of nodes) {
    const parentFenFull = chess.fen();
    const parentFen = normalizeFen(parentFenFull);
    const moveResult = chess.move(node.san);
    if (!moveResult) {
      // Some large PGNs contain malformed SAN tokens or branch corruption.
      // Stop this branch instead of crashing the whole import.
      console.warn(`[PGN import] Illegal move "${node.san}" at ${parentFen}; skipping remaining moves in this branch.`);
      return;
    }
    const fen = normalizeFen(chess.fen());
    const uci = moveResult.from + moveResult.to + (moveResult.promotion ?? '');
    const turnAfter = chess.turn() === 'w' ? 'white' : 'black';
    const moveNumber = parseInt(parentFenFull.split(' ')[5], 10) || 1;

    out.push({
      parentFen,
      fen,
      san: moveResult.san,
      uci,
      moveNumber,
      colorToMove: turnAfter,
      comment: node.comment,
      isMainLine: onMainLine,
    });

    for (const variation of node.variations) {
      const branch = new Chess(parentFenFull);
      walk(branch, variation, out, false);
    }
  }
}
