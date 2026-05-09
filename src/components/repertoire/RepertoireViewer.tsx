'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChessBoard, type BoardArrow } from '@/components/board/ChessBoard';
import { useTreeNavigation } from '@/lib/hooks/useTreeNavigation';
import { AnnotationSearch } from './AnnotationSearch';
import {
  EmptyState,
  PremiumPanel,
  SecondaryButton,
  fieldClassName,
} from '@/components/ui/Premium';

export type ViewerMove = {
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
};

export type ViewerPosition = {
  id: string;
  fen: string;
  annotation: string | null;
};

type Props = {
  repertoireColor: 'white' | 'black';
  rootPositionId: string;
  positions: ViewerPosition[];
  moves: ViewerMove[];
  chapters: { id: string; name: string }[];
  selectedChapterName?: string | null;
  onAnnotationSave?: (positionId: string, text: string) => void;
  jumpToPositionId?: string | null;
  onJumpDone?: () => void;
};

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

export function RepertoireViewer({
  repertoireColor,
  rootPositionId,
  positions,
  moves,
  chapters,
  selectedChapterName,
  onAnnotationSave,
  jumpToPositionId,
  onJumpDone,
}: Props) {
  const positionsById = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);

  const {
    path,
    currentPositionId,
    nextMoves,
    rawNextMoves,
    lastMove,
    goRoot,
    goBack,
    goForward,
    goToIndex,
    playMove,
    jumpToPosition,
  } = useTreeNavigation(rootPositionId, moves);

  useEffect(() => {
    if (jumpToPositionId) {
      jumpToPosition(jumpToPositionId);
      onJumpDone?.();
    }
  }, [jumpToPositionId, jumpToPosition, onJumpDone]);

  const currentPosition = positionsById.get(currentPositionId);
  const currentFen = currentPosition?.fen ?? STARTING_FEN;

  const [showArrows, setShowArrows] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowArrows((s) => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const arrows: BoardArrow[] = useMemo(() => {
    if (!showArrows || nextMoves.length <= 1) return [];
    const brushes = ['green', 'blue', 'red', 'yellow', 'paleGreen', 'paleBlue', 'paleRed'];
    return nextMoves.map((m, i) => ({
      orig: m.uci.slice(0, 2),
      dest: m.uci.slice(2, 4),
      brush: brushes[i % brushes.length],
    }));
  }, [showArrows, nextMoves]);

  const sourcesByBranch = useMemo(() => {
    const map = new Map<string, ViewerMove[]>();
    for (const move of rawNextMoves) {
      const key = `${move.parentPositionId}:${move.childPositionId}:${move.uci}`;
      const group = map.get(key) ?? [];
      group.push(move);
      map.set(key, group);
    }
    return map;
  }, [rawNextMoves]);

  const [editingAnnotation, setEditingAnnotation] = useState(false);
  const [annotationDraft, setAnnotationDraft] = useState('');

  const startEditAnnotation = () => {
    setAnnotationDraft(currentPosition?.annotation ?? '');
    setEditingAnnotation(true);
  };

  const saveAnnotation = () => {
    if (onAnnotationSave && currentPositionId) {
      onAnnotationSave(currentPositionId, annotationDraft);
    }
    setEditingAnnotation(false);
  };

  if (chapters.length === 0) {
    return <EmptyState>This course is empty. Import a PGN to get started.</EmptyState>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(360px,520px)_1fr]">
      <PremiumPanel>
        <div className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#152023] px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3a0]">
                {selectedChapterName ? 'Filtered position' : 'Position'}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#f4faf7]">
                {path.length === 0 ? 'Starting position' : `${path.length} moves deep`}
              </p>
              {selectedChapterName && (
                <p className="mt-1 text-xs text-[#8fa3a0]">{selectedChapterName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowArrows((s) => !s)}
              aria-pressed={showArrows}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70 ${
                showArrows ? 'bg-[#7dd3c7] text-[#071314]' : 'bg-[#223034] text-[#dfe8e4]'
              }`}
            >
              Arrows {showArrows ? 'on' : 'off'}
            </button>
          </div>
          <div className="rounded-xl bg-[#152023] p-3">
            <ChessBoard fen={currentFen + ' 0 1'} orientation={repertoireColor} lastMove={lastMove} arrows={arrows} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <SecondaryButton onClick={goRoot} disabled={path.length === 0} className="px-3 py-2 text-xs">
              Start
            </SecondaryButton>
            <SecondaryButton onClick={goBack} disabled={path.length === 0} className="px-3 py-2 text-xs">
              Back
            </SecondaryButton>
            <SecondaryButton onClick={goForward} disabled={nextMoves.length === 0} className="px-3 py-2 text-xs">
              Forward
            </SecondaryButton>
          </div>
        </div>
      </PremiumPanel>

      <div className="space-y-4">
        <PremiumPanel>
          <section className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3a0]">Line</p>
            {path.length === 0 ? (
              <p className="mt-3 text-sm text-[#9fb0aa]">Starting position. Pick a move below.</p>
            ) : (
              <ol className="mt-3 flex flex-wrap gap-2 text-sm">
                {path.map((m, i) => (
                  <li key={m.id}>
                    <button
                      onClick={() => goToIndex(i)}
                      className="rounded-lg bg-[#172225] px-3 py-1.5 font-mono text-[#dfe8e4] transition-colors duration-200 hover:bg-[#223034] hover:text-[#f4faf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70"
                    >
                      {m.colorToMove === 'black' && <span className="text-[#8fa3a0]">{m.moveNumber}.</span>}
                      {m.colorToMove === 'white' && <span className="text-[#8fa3a0]">{m.moveNumber}...</span>}{' '}
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3a0]">
                Next moves {nextMoves.length > 0 && `(${nextMoves.length})`}
              </p>
            </div>

            {nextMoves.length === 0 ? (
              <p className="text-sm text-[#9fb0aa]">End of line.</p>
            ) : (
              <ul className="space-y-2">
                {nextMoves.map((m, i) => (
                  <li key={`${m.parentPositionId}-${m.childPositionId}-${m.uci}`}>
                    <button
                      onClick={() => playMove(m)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#172225] px-4 py-3 text-left text-sm transition-[background-color,transform] duration-200 hover:bg-[#223034] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70 active:scale-[0.99]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#223034] text-xs font-semibold text-[#a8e7df]">
                          {i + 1}
                        </span>
                        <span className="font-mono text-[#f4faf7]">{m.san}</span>
                      </span>
                      <span className="flex flex-wrap justify-end gap-2 text-xs text-[#8fa3a0]">
                        {(() => {
                          const branchSources =
                            sourcesByBranch.get(`${m.parentPositionId}:${m.childPositionId}:${m.uci}`) ?? [m];
                          const uniqueChapterNames = Array.from(
                            new Set(branchSources.map((source) => source.chapterName).filter(Boolean)),
                          );
                          return uniqueChapterNames.length > 1 ? (
                            <span className="rounded-md bg-[#7dd3c7]/[0.14] px-2 py-1 text-[#a8e7df]">
                              {uniqueChapterNames.length} chapters
                            </span>
                          ) : null;
                        })()}
                        <span
                          className={
                            m.moveType === 'repertoire'
                              ? 'rounded-md bg-[#1f6b55]/[0.24] px-2 py-1 text-[#8ee6ae]'
                              : m.moveType === 'opponent'
                                ? 'rounded-md bg-[#223034] px-2 py-1 text-[#aebdb8]'
                                : 'rounded-md bg-[#f1cc7a]/[0.15] px-2 py-1 text-[#f1cc7a]'
                          }
                        >
                          {m.moveType}
                        </span>
                        <span>{m.chapterName}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </PremiumPanel>

        <PremiumPanel>
          <section className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3a0]">Note</p>
              {onAnnotationSave && !editingAnnotation && (
                <SecondaryButton onClick={startEditAnnotation} className="px-4 py-2 text-xs">
                  Edit
                </SecondaryButton>
              )}
            </div>
            {editingAnnotation ? (
              <div className="space-y-3">
                <textarea
                  value={annotationDraft}
                  onChange={(e) => setAnnotationDraft(e.target.value)}
                  rows={4}
                  className={fieldClassName}
                  autoFocus
                />
                <div className="flex gap-2">
                  <SecondaryButton onClick={saveAnnotation} className="px-4 py-2 text-xs">
                    Save
                  </SecondaryButton>
                  <SecondaryButton onClick={() => setEditingAnnotation(false)} className="px-4 py-2 text-xs">
                    Cancel
                  </SecondaryButton>
                </div>
              </div>
            ) : currentPosition?.annotation ? (
              <p className="rounded-xl bg-[#172225] p-4 text-sm leading-6 text-[#dfe8e4]">
                {currentPosition.annotation}
              </p>
            ) : (
              <p className="text-sm text-[#9fb0aa]">
                No annotation.{' '}
                {onAnnotationSave && (
                  <button
                    onClick={startEditAnnotation}
                    className="rounded-md font-semibold text-[#7dd3c7] transition-colors duration-200 hover:text-[#a8e7df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70"
                  >
                    Add one
                  </button>
                )}
              </p>
            )}
          </section>
        </PremiumPanel>

        <PremiumPanel>
          <section className="p-5">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3a0]">Search</p>
            <AnnotationSearch positions={positions} onSelect={jumpToPosition} />
          </section>
        </PremiumPanel>
      </div>
    </div>
  );
}
