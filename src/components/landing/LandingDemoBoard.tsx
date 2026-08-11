'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, type BoardSquareMark } from '@/components/board/ChessBoard';

const START_FEN = '2b5/4Q1pp/pp3n1k/3p3q/P2P1P2/BP1B2P1/7P/6K1 w - - 0 1';

export function LandingDemoBoard() {
  const [fen, setFen] = useState(START_FEN);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [replyPending, setReplyPending] = useState(false);
  const replyTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
  }, []);

  const position = useMemo(() => {
    try {
      return new Chess(fen, { skipValidation: true });
    } catch {
      return new Chess(START_FEN, { skipValidation: true });
    }
  }, [fen]);

  const legalDests = useMemo(() => {
    const dests = new Map<string, string[]>();
    if (position.isGameOver() || replyPending) return dests;
    for (const move of position.moves({ verbose: true })) {
      const values = dests.get(move.from) ?? [];
      values.push(move.to);
      dests.set(move.from, values);
    }
    return dests;
  }, [position, replyPending]);

  const kingMark = findCheckKing(position);

  const onMove = (from: string, to: string) => {
    if (replyPending || position.isGameOver()) return;
    const next = new Chess(fen, { skipValidation: true });
    try {
      const move = next.move({ from, to, promotion: 'q' });
      if (!move) return;
      const nextFen = next.fen();
      setFen(nextFen);
      setLastMove([from, to]);

      // The landing example starts from the classic Qxf6+ motif. Let the
      // recapturing pawn answer automatically, then return control to the
      // visitor for continued free analysis.
      if (from === 'e7' && to === 'f6' && move.san.startsWith('Qxf6')) {
        setReplyPending(true);
        replyTimer.current = window.setTimeout(() => {
          const reply = new Chess(nextFen, { skipValidation: true });
          try {
            const response = reply.move({ from: 'g7', to: 'f6' });
            if (response) {
              setFen(reply.fen());
              setLastMove(['g7', 'f6']);
            }
          } finally {
            setReplyPending(false);
            replyTimer.current = null;
          }
        }, 420);
      }
    } catch {
      // Chessground only supplies legal destinations; ignore stale callbacks.
    }
  };

  const reset = () => {
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
    replyTimer.current = null;
    setReplyPending(false);
    setFen(START_FEN);
    setLastMove(undefined);
  };

  const checkmate = position.isCheckmate();
  const check = position.isCheck();

  return (
    <div>
      <ChessBoard
        fen={fen}
        orientation="white"
        viewOnly={checkmate || replyPending}
        lastMove={lastMove}
        movable={{ color: 'both', dests: legalDests, showDests: true }}
        premovable={{ enabled: false }}
        squareMarks={kingMark}
        onMove={onMove}
      />
      <div className="mt-3 flex min-h-5 items-center justify-between gap-3 px-1">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
          {replyPending ? 'Book reply…' : checkmate ? 'Checkmate' : check ? 'Check' : 'Try a move'}
        </p>
        {(checkmate || fen !== START_FEN) && (
          <button
            type="button"
            onClick={reset}
            className="font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] underline-offset-4 transition-colors hover:text-[color:var(--margin-red)]"
          >
            Reset board
          </button>
        )}
      </div>
    </div>
  );
}

function findCheckKing(position: Chess): BoardSquareMark[] {
  if (!position.isCheck() && !position.isCheckmate()) return [];
  const board = position.board();
  for (let rankIndex = 0; rankIndex < board.length; rankIndex += 1) {
    const row = board[rankIndex];
    for (let fileIndex = 0; fileIndex < row.length; fileIndex += 1) {
      const piece = row[fileIndex];
      if (piece?.type === 'k' && piece.color === position.turn()) {
        return [{
          orig: `${String.fromCharCode(97 + fileIndex)}${8 - rankIndex}`,
          brush: 'red',
        }];
      }
    }
  }
  return [];
}
