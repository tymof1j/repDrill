'use client';

import { useMemo, useTransition } from 'react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { useTreeNavigation } from '@/lib/hooks/useTreeNavigation';
import {
  setRepertoireChoiceAction,
  clearRepertoireChoiceAction,
} from '@/app/repertoires/actions';
import { PremiumPanel, SecondaryButton } from '@/components/ui/Premium';

export type MergedMove = {
  id: string;
  parentPositionId: string;
  childPositionId: string;
  san: string;
  uci: string;
  moveNumber: number;
  colorToMove: 'white' | 'black';
  isMainLine: boolean;
  moveType: 'repertoire' | 'opponent' | 'alternative';
  chapterId: string;
  chapterName: string;
  courseId: string;
  courseName: string;
  courseColor: 'white' | 'black';
};

export type MergedPosition = {
  id: string;
  fen: string;
  annotation: string | null;
};

export type MergedChoice = {
  positionId: string;
  preferredMoveId: string;
};

type Props = {
  repertoireId: string;
  rootPositionId: string;
  positions: MergedPosition[];
  moves: MergedMove[];
  choices: MergedChoice[];
};

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

export function MergedRepertoireViewer({
  repertoireId,
  rootPositionId,
  positions,
  moves,
  choices,
}: Props) {
  const positionsById = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);
  const choiceByPosition = useMemo(
    () => new Map(choices.map((c) => [c.positionId, c.preferredMoveId])),
    [choices],
  );

  const {
    path,
    currentPositionId,
    rawNextMoves: nextMovesRaw,
    lastMove,
    goRoot,
    goBack,
    goForward,
    goToIndex,
    playMove,
  } = useTreeNavigation(rootPositionId, moves);

  const [pending, startTransition] = useTransition();

  const currentPosition = positionsById.get(currentPositionId);
  const currentFen = currentPosition?.fen ?? STARTING_FEN;

  type GroupedMove = { san: string; uci: string; moves: MergedMove[] };
  const grouped: GroupedMove[] = useMemo(() => {
    const bySan = new Map<string, GroupedMove>();
    for (const m of nextMovesRaw) {
      const existing = bySan.get(m.san);
      if (existing) {
        existing.moves.push(m);
      } else {
        bySan.set(m.san, { san: m.san, uci: m.uci, moves: [m] });
      }
    }
    return Array.from(bySan.values()).sort((a, b) => {
      const aMain = a.moves.some((m) => m.isMainLine);
      const bMain = b.moves.some((m) => m.isMainLine);
      if (aMain !== bMain) return aMain ? -1 : 1;
      return a.san.localeCompare(b.san);
    });
  }, [nextMovesRaw]);

  const repertoireOptions = grouped.filter((g) =>
    g.moves.some((m) => m.moveType === 'repertoire'),
  );
  const hasConflict = repertoireOptions.length >= 2;
  const preferredMoveId = choiceByPosition.get(currentPositionId);

  const orientation: 'white' | 'black' =
    path.length === 0 ? 'white' : path[0].colorToMove === 'black' ? 'white' : 'black';

  const setPreferred = (move: MergedMove) => {
    const fd = new FormData();
    fd.set('repertoireId', repertoireId);
    fd.set('positionId', currentPositionId);
    fd.set('moveId', move.id);
    startTransition(() => {
      void setRepertoireChoiceAction(fd);
    });
  };

  const clearPreferred = () => {
    const fd = new FormData();
    fd.set('repertoireId', repertoireId);
    fd.set('positionId', currentPositionId);
    startTransition(() => {
      void clearRepertoireChoiceAction(fd);
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(360px,520px)_1fr]">
      <PremiumPanel>
        <div className="p-4 md:p-5">
          <div className="mb-4 rounded-xl bg-[#f8f1df]/[0.065] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a99d82]">
              Position
            </p>
            <p className="mt-1 text-sm font-semibold text-[#fff8e6]">
              {path.length === 0 ? 'Starting position' : `${path.length} moves deep`}
            </p>
          </div>
          <div className="rounded-xl bg-[#f8f1df]/[0.065] p-3">
            <ChessBoard fen={currentFen + ' 0 1'} orientation={orientation} lastMove={lastMove} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <SecondaryButton onClick={goRoot} disabled={path.length === 0} className="px-3 py-2 text-xs">
              Start
            </SecondaryButton>
            <SecondaryButton onClick={goBack} disabled={path.length === 0} className="px-3 py-2 text-xs">
              Back
            </SecondaryButton>
            <SecondaryButton onClick={goForward} disabled={grouped.length === 0} className="px-3 py-2 text-xs">
              Forward
            </SecondaryButton>
          </div>
        </div>
      </PremiumPanel>

      <div className="space-y-4">
        <PremiumPanel>
          <section className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a99d82]">Line</p>
            {path.length === 0 ? (
              <p className="mt-3 text-sm text-[#a99f89]">Starting position. Pick a move below.</p>
            ) : (
              <ol className="mt-3 flex flex-wrap gap-2 text-sm">
                {path.map((m, i) => (
                  <li key={`${m.id}-${i}`}>
                    <button
                      onClick={() => goToIndex(i)}
                      className="rounded-lg bg-[#f8f1df]/[0.07] px-3 py-1.5 font-mono text-[#d8cfba] transition-colors duration-200 hover:bg-[#f8f1df]/[0.12] hover:text-[#fff8e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b46a]/70"
                    >
                      {m.colorToMove === 'black' && <span className="text-[#8f846d]">{m.moveNumber}.</span>}
                      {m.colorToMove === 'white' && <span className="text-[#8f846d]">{m.moveNumber}...</span>}{' '}
                      {m.san}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </PremiumPanel>

        <PremiumPanel>
          <section className="p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a99d82]">
                Next moves {grouped.length > 0 && `(${grouped.length})`}
              </p>
              {hasConflict && (
                <span className="rounded-md bg-[#d7b46a]/[0.16] px-3 py-1 text-xs font-semibold text-[#ead9a5]">
                  Conflict
                </span>
              )}
            </div>

            {grouped.length === 0 ? (
              <p className="text-sm text-[#a99f89]">End of line.</p>
            ) : (
              <ul className="space-y-2">
                {grouped.map((g, i) => {
                  const isPreferred = g.moves.some((m) => m.id === preferredMoveId);
                  const repertoireMove = g.moves.find((m) => m.moveType === 'repertoire');
                  return (
                    <li key={g.san}>
                      <div
                        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                          isPreferred
                            ? 'border-[#73d5a0]/40 bg-[#167753]/[0.16]'
                            : 'border-[#f8f1df]/10 bg-[#f8f1df]/[0.06]'
                        }`}
                      >
                        <button
                          onClick={() => playMove(g.moves[0])}
                          className="flex flex-1 flex-wrap items-center gap-3 rounded-lg text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b46a]/70"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f8f1df]/[0.09] text-xs font-semibold text-[#d7c69f]">
                            {i + 1}
                          </span>
                          <span className="font-mono text-[#fff8e6]">{g.san}</span>
                          <span className="flex flex-wrap gap-1">
                            {g.moves.map((m) => (
                              <span
                                key={m.id}
                                className="rounded-md bg-[#f8f1df]/[0.08] px-2 py-1 text-xs text-[#c8b68c]"
                                title={`${m.courseName} · ${m.chapterName}`}
                              >
                                {m.courseName}
                              </span>
                            ))}
                          </span>
                        </button>
                        {hasConflict && repertoireMove && (
                          <div className="flex shrink-0 items-center gap-1">
                            {isPreferred ? (
                              <SecondaryButton onClick={clearPreferred} disabled={pending} className="px-4 py-2 text-xs">
                                Clear
                              </SecondaryButton>
                            ) : (
                              <SecondaryButton
                                onClick={() => setPreferred(repertoireMove)}
                                disabled={pending}
                                className="px-4 py-2 text-xs"
                              >
                                Pick
                              </SecondaryButton>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </PremiumPanel>

        {currentPosition?.annotation && (
          <PremiumPanel>
            <section className="p-5">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a99d82]">Note</p>
              <p className="rounded-xl bg-[#f8f1df]/[0.07] p-4 text-sm leading-6 text-[#d8cfba]">
                {currentPosition.annotation}
              </p>
            </section>
          </PremiumPanel>
        )}
      </div>
    </div>
  );
}
