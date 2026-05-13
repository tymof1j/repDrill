'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChessBoard, type BoardArrow } from '@/components/board/ChessBoard';
import { useTreeNavigation } from '@/lib/hooks/useTreeNavigation';
import { AnnotationSearch } from './AnnotationSearch';
import {
  DiagramFrame,
  EmptyState,
  GhostButton,
  SecondaryButton,
  Stamp,
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
    <div className="grid gap-10 lg:grid-cols-[minmax(360px,500px)_1fr] lg:gap-14">
      {/* ── Diagram ─────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            {selectedChapterName ? 'Chapter diagram' : 'Diagram'}
          </p>
          <div className="flex items-baseline gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">
              {path.length === 0 ? 'starting' : `${path.length} ply`}
            </p>
            <button
              type="button"
              onClick={() => setShowArrows((s) => !s)}
              aria-pressed={showArrows}
              className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] underline decoration-1 underline-offset-[6px] transition-colors duration-200 ${
                showArrows
                  ? 'text-[color:var(--margin-red)] decoration-[color:var(--margin-red)]'
                  : 'text-[color:var(--ink-faint)] decoration-[color:var(--paper-edge)] hover:text-[color:var(--ink)]'
              }`}
              title="Toggle alternative move arrows (v)"
            >
              Arrows {showArrows ? 'on' : 'off'}
            </button>
          </div>
        </div>

        <DiagramFrame
          caption={selectedChapterName ? `Filtered to: ${selectedChapterName}` : `§ ${path.length === 0 ? 'opening' : `move ${Math.ceil((path.length + 1) / 2)}`}`}
        >
          <ChessBoard
            fen={currentFen + ' 0 1'}
            orientation={repertoireColor}
            lastMove={lastMove}
            arrows={arrows}
          />
        </DiagramFrame>

        <div className="mt-6 grid grid-cols-3 divide-x divide-[color:var(--paper-edge)] border border-[color:var(--paper-edge)]">
          <button
            type="button"
            onClick={goRoot}
            disabled={path.length === 0}
            className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink)] transition-colors duration-200 hover:bg-[color:var(--paper-deep)] disabled:cursor-not-allowed disabled:text-[color:var(--ink-ghost)]"
          >
            ⟪ Start
          </button>
          <button
            type="button"
            onClick={goBack}
            disabled={path.length === 0}
            className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink)] transition-colors duration-200 hover:bg-[color:var(--paper-deep)] disabled:cursor-not-allowed disabled:text-[color:var(--ink-ghost)]"
          >
            ◀ Back
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={nextMoves.length === 0}
            className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink)] transition-colors duration-200 hover:bg-[color:var(--paper-deep)] disabled:cursor-not-allowed disabled:text-[color:var(--ink-ghost)]"
          >
            Forward ▶
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">
          <kbd className="font-mono">v</kbd> arrows · <kbd className="font-mono">/</kbd> search annotations
        </p>
      </div>

      {/* ── Right page: line + branches + annotation + search ─ */}
      <div className="space-y-10">
        {/* Line */}
        <section>
          <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Line
          </p>
          {path.length === 0 ? (
            <p className="mt-4 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
              Starting position. Pick a continuation below.
            </p>
          ) : (
            <ol className="notation mt-4 flex flex-wrap gap-2 text-[15px] leading-relaxed text-[color:var(--ink)]">
              {path.map((m, i) => (
                <li key={m.id}>
                  <button
                    onClick={() => goToIndex(i)}
                    className={`rounded-lg px-2.5 py-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)] ${
                      i === path.length - 1
                        ? 'bg-[color:var(--ink-faint)] text-[color:var(--paper)]'
                        : 'bg-[color:var(--paper-deep)] text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]'
                    }`}
                  >
                    {m.colorToMove === 'white' && (
                      <span className={i === path.length - 1 ? 'text-[color:var(--paper)]' : 'text-[color:var(--ink-faint)]'}>
                        {m.moveNumber}.
                      </span>
                    )}{m.san}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Branches */}
        <section>
          <div className="flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Branches{nextMoves.length > 0 && ` · ${nextMoves.length}`}
            </p>
          </div>

          {nextMoves.length === 0 ? (
            <p className="mt-4 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
              End of line.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[color:var(--paper-rule)] border-y border-[color:var(--paper-edge)]">
              {nextMoves.map((m, i) => {
                const branchSources =
                  sourcesByBranch.get(`${m.parentPositionId}:${m.childPositionId}:${m.uci}`) ?? [m];
                const uniqueChapterNames = Array.from(
                  new Set(branchSources.map((s) => s.chapterName).filter(Boolean)),
                );
                const moveTypeStamp =
                  m.moveType === 'repertoire' ? 'green' : m.moveType === 'alternative' ? 'gold' : 'ink';
                return (
                  <li
                    key={`${m.parentPositionId}-${m.childPositionId}-${m.uci}`}
                    className="group grid grid-cols-[2.25rem_1fr_auto] items-baseline gap-4 px-2 py-3 transition-colors duration-200 hover:bg-[color:var(--paper-shade)]"
                  >
                    <span
                      className="font-display text-base italic text-[color:var(--ink-faint)]"
                      style={{ fontFeatureSettings: '"onum"' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => playMove(m)}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
                    >
                      <span className="notation text-base font-medium text-[color:var(--ink)]">
                        {m.san}
                      </span>
                      <Stamp tone={moveTypeStamp}>{m.moveType}</Stamp>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                        {m.chapterName}
                      </span>
                      {uniqueChapterNames.length > 1 && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--margin-red)]">
                          +{uniqueChapterNames.length - 1} chapters
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Annotation */}
        <section>
          <div className="flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Annotation
            </p>
            {onAnnotationSave && !editingAnnotation && (
              <GhostButton onClick={startEditAnnotation}>Edit</GhostButton>
            )}
          </div>
          {editingAnnotation ? (
            <div className="mt-4 space-y-3">
              <textarea
                value={annotationDraft}
                onChange={(e) => setAnnotationDraft(e.target.value)}
                rows={4}
                className={fieldClassName}
                autoFocus
              />
              <div className="flex gap-3">
                <SecondaryButton onClick={saveAnnotation}>Save</SecondaryButton>
                <GhostButton onClick={() => setEditingAnnotation(false)}>Cancel</GhostButton>
              </div>
            </div>
          ) : currentPosition?.annotation ? (
            <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">
              {currentPosition.annotation}
            </p>
          ) : (
            <p className="mt-4 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
              No annotation.{' '}
              {onAnnotationSave && (
                <button
                  onClick={startEditAnnotation}
                  className="book-link text-[color:var(--ink)] hover:text-[color:var(--margin-red)]"
                >
                  Add one.
                </button>
              )}
            </p>
          )}
        </section>

        {/* Search */}
        <section>
          <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Search annotations
          </p>
          <div className="mt-4">
            <AnnotationSearch positions={positions} onSelect={jumpToPosition} />
          </div>
        </section>
      </div>
    </div>
  );
}
