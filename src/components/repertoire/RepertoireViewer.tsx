'use client';

import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, type BoardArrow, type BoardSquareMark } from '@/components/board/ChessBoard';
import { useTreeNavigation } from '@/lib/hooks/useTreeNavigation';
import { AnnotationSearch } from './AnnotationSearch';
import {
  EmptyState,
  GhostButton,
  SecondaryButton,
  Stamp,
  fieldClassName,
} from '@/components/ui/Premium';
import { ResizableDiagramFrame } from '@/components/board/ResizableDiagramFrame';
import {
  type ArrowTheme,
  PREFERENCES_EVENT,
  getArrowBrushes,
  getBoardBrushes,
  getArrowTheme,
  getHintBrush,
  normalizeArrowTheme,
} from '@/lib/preferences';

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
  const [preview, setPreview] = useState<{
    positionId: string;
    fen: string;
    lastMove: [string, string];
  } | null>(null);
  // The position id makes previews self-invalidating whenever the canonical
  // tree navigation changes, without an effect that races the board render.
  const activePreview = preview?.positionId === currentPositionId ? preview : null;
  const displayedFen = activePreview?.fen ?? currentFen;

  const previewNotationMove = (san: string) => {
    try {
      const chess = new Chess(completeFen(displayedFen));
      const result = chess.move(san, { strict: false });
      if (!result) return;
      setPreview({
        positionId: currentPositionId,
        fen: chess.fen(),
        lastMove: [result.from, result.to],
      });
    } catch {
      // A prose token may be SAN-shaped but illegal from this position.
    }
  };

  const [showArrows, setShowArrows] = useState(true);
  const [showHighlights, setShowHighlights] = useState(true);
  const [arrowTheme, setArrowTheme] = useState<ArrowTheme>(() => getArrowTheme());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowArrows((s) => !s);
      }
      if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHighlights((s) => !s);
      }
    };
    window.addEventListener('keydown', handler);
    const prefHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ arrowTheme?: string }>).detail;
      setArrowTheme(normalizeArrowTheme(detail?.arrowTheme ?? getArrowTheme()));
    };
    window.addEventListener(PREFERENCES_EVENT, prefHandler as EventListener);
    window.addEventListener('storage', prefHandler as EventListener);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener(PREFERENCES_EVENT, prefHandler as EventListener);
      window.removeEventListener('storage', prefHandler as EventListener);
    };
  }, []);

  const arrows: BoardArrow[] = useMemo(() => {
    if (!showArrows || nextMoves.length <= 1) return [];
    const brushes = getArrowBrushes(arrowTheme);
    return nextMoves.map((m, i) => ({
      orig: m.uci.slice(0, 2),
      dest: m.uci.slice(2, 4),
      brush: brushes[i % brushes.length],
    }));
  }, [showArrows, nextMoves, arrowTheme]);

  // Highlight source squares of pieces with a continuation in the tree.
  // Shown only when:
  //   - it is the user's turn (any number of options), OR
  //   - it is the opponent's turn and there is exactly one forced reply.
  // When the opponent has multiple branches, arrows already disambiguate.
  // Theory-mode only — when a "tactics" course category is introduced,
  // skip this so the puzzle doesn't telegraph which piece to move.
  const movablePieceMarks = useMemo<BoardSquareMark[]>(() => {
    if (!showHighlights || nextMoves.length === 0) return [];
    const turn = currentFen.split(/\s+/)[1] === 'b' ? 'black' : 'white';
    const isUserTurn = turn === repertoireColor;
    if (!isUserTurn && nextMoves.length !== 1) return [];
    const seen = new Set<string>();
    const marks: BoardSquareMark[] = [];
    for (const m of nextMoves) {
      const orig = m.uci.slice(0, 2);
      if (seen.has(orig)) continue;
      seen.add(orig);
      marks.push({ orig, brush: getHintBrush(arrowTheme) });
    }
    return marks;
  }, [showHighlights, nextMoves, currentFen, repertoireColor, arrowTheme]);

  const legalDests = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of nextMoves) {
      const orig = m.uci.slice(0, 2);
      const dest = m.uci.slice(2, 4);
      const arr = map.get(orig) ?? [];
      if (!arr.includes(dest)) arr.push(dest);
      map.set(orig, arr);
    }
    return map;
  }, [nextMoves]);

  const moveColor = useMemo<'white' | 'black'>(() => {
    const side = currentFen.split(/\s+/)[1];
    return side === 'b' ? 'black' : 'white';
  }, [currentFen]);

  const onBoardMove = (orig: string, dest: string) => {
    const exact = nextMoves.find((m) => m.uci.slice(0, 2) === orig && m.uci.slice(2, 4) === dest);
    if (exact) {
      playMove(exact);
      return;
    }
    try {
      const chess = new Chess(completeFen(currentFen));
      const result = chess.move({ from: orig, to: dest, promotion: 'q' });
      if (!result) return;
      const fallback = nextMoves.find((m) => m.san === result.san);
      if (fallback) {
        playMove(fallback);
      }
    } catch {
      // invalid local drag
    }
  };

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
    <div className="grid min-w-0 gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-14">
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
              onClick={() => setShowHighlights((s) => !s)}
              aria-pressed={showHighlights}
              className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] underline decoration-1 underline-offset-[6px] transition-colors duration-200 ${
                showHighlights
                  ? 'text-[color:var(--margin-red)] decoration-[color:var(--margin-red)]'
                  : 'text-[color:var(--ink-faint)] decoration-[color:var(--paper-edge)] hover:text-[color:var(--ink)]'
              }`}
              title="Toggle piece highlights (h)"
            >
              Hints {showHighlights ? 'on' : 'off'}
            </button>
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

        <div className="-mx-5 md:mx-0">
          <ResizableDiagramFrame
            caption={selectedChapterName ? `Filtered to: ${selectedChapterName}` : `§ ${path.length === 0 ? 'opening' : `move ${Math.ceil((path.length + 1) / 2)}`}`}
          >
            <ChessBoard
              fen={completeFen(displayedFen)}
              orientation={repertoireColor}
              lastMove={activePreview ? activePreview.lastMove : lastMove}
              arrows={arrows}
              squareMarks={movablePieceMarks}
              brushes={getBoardBrushes(arrowTheme)}
              viewOnly={Boolean(activePreview)}
              movable={{ free: false, dests: legalDests, color: moveColor, showDests: true }}
              onMove={onBoardMove}
            />
          </ResizableDiagramFrame>
        </div>

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
        {activePreview && (
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--library-green)] underline decoration-1 underline-offset-4"
          >
            Return to line position
          </button>
        )}

        {/* Annotation — narrow screens only: right below nav controls */}
        <section className="mt-4 md:hidden">
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
            <StudyAnnotation text={currentPosition.annotation} onNotationMove={previewNotationMove} />
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

        {/* Keyboard hint */}
        <p className="mt-3 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)] md:block">
          <kbd className="font-mono">v</kbd> arrows · <kbd className="font-mono">h</kbd> hints · <kbd className="font-mono">/</kbd> search annotations
        </p>
      </div>

      {/* ── Right page: line + branches + annotation + search ─ */}
      <div className="min-w-0 space-y-10">
        {/* Line */}
        <section>
          <div className="flex items-baseline gap-3 border-b border-[color:var(--paper-edge)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Line
            </p>
          </div>
          {path.length === 0 ? (
            <p className="mt-4 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
              Starting position. Pick a continuation below.
            </p>
          ) : (
            <ol className="notation mt-4 flex flex-wrap gap-2 text-[15px] leading-relaxed text-[color:var(--ink)]">
              {path.map((m, i) => {
                const hasAnnotation = Boolean(
                  positionsById.get(m.childPositionId)?.annotation?.trim(),
                );
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => goToIndex(i)}
                      className={`rounded-lg px-2.5 py-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)] ${
                        i === path.length - 1
                          ? 'bg-[color:var(--ink-faint)] text-[color:var(--paper)]'
                          : hasAnnotation
                            ? 'bg-[color:var(--library-green)]/15 text-[color:var(--library-green)] hover:bg-[color:var(--library-green)]/25'
                            : 'bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]'
                      }`}
                    >
                      {i % 2 === 0 && (
                        <span className={i === path.length - 1 ? 'text-[color:var(--paper)]' : 'text-[color:var(--ink-faint)]'}>
                          {Math.floor(i / 2) + 1}.
                        </span>
                      )}{m.san}
                    </button>
                  </li>
                );
              })}
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
                  <li key={`${m.parentPositionId}-${m.childPositionId}-${m.uci}`}>
                    <button
                      onClick={() => playMove(m)}
                      className="group grid w-full grid-cols-[2.25rem_1fr_auto] items-baseline gap-4 px-2 py-3 text-left transition-colors duration-200 hover:bg-[color:var(--paper-shade)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
                    >
                      <span
                        className="font-display text-base italic text-[color:var(--ink-faint)]"
                        style={{ fontFeatureSettings: '"onum"' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="notation text-base font-medium text-[color:var(--ink)]">
                          {m.san}
                        </span>
                        <Stamp tone={moveTypeStamp}>{m.moveType}</Stamp>
                        <span className="w-full font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden text-ellipsis leading-[1.45]">
                          {m.chapterName}
                          {uniqueChapterNames.length > 1
                            ? ` · +${uniqueChapterNames.length - 1} chapters`
                            : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Annotation */}
        <section className="hidden md:block">
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
            <StudyAnnotation text={currentPosition.annotation} onNotationMove={previewNotationMove} />
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

const SAN_TOKEN = /^(?:O-O(?:-O)?|0-0(?:-0)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)$/i;

function completeFen(fen: string) {
  const fields = fen.trim().split(/\s+/);
  if (fields.length >= 6) return fields.slice(0, 6).join(' ');
  if (fields.length === 5) return `${fields.join(' ')} 1`;
  if (fields.length === 4) return `${fields.join(' ')} 0 1`;
  return `${STARTING_FEN} 0 1`;
}

function splitNotationToken(token: string) {
  const match = token.match(/^([([{]*)(?:(?:\d+\.{1,3}|\.{3})?)([^\s]+?)([.,;:!?)}\]]*)$/);
  if (!match) return null;
  const [, prefix, rawMove, suffix] = match;
  const move = rawMove.replace(/[.,;:!?)}\]]+$/, '');
  if (!SAN_TOKEN.test(move)) return null;
  return { prefix, move, suffix };
}

function StudyAnnotation({ text, onNotationMove }: { text: string; onNotationMove: (san: string) => void }) {
  const parts = text.split(/(\s+)/);
  return (
    <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">
      {parts.map((part, index) => {
        if (/^\s+$/.test(part)) return <span key={`space-${index}`}>{part}</span>;
        const parsed = splitNotationToken(part);
        if (!parsed) return <span key={`text-${index}`}>{part}</span>;
        return (
          <span key={`move-${index}`}>
            {parsed.prefix}
            <button
              type="button"
              className="notation rounded px-0.5 text-[color:var(--library-green)] underline decoration-[color:var(--library-green-soft)] decoration-1 underline-offset-4 transition-colors hover:bg-[color:var(--library-green)]/10"
              title={`Preview ${parsed.move}`}
              onClick={() => onNotationMove(parsed.move)}
            >
              {parsed.move}
            </button>
            {parsed.suffix}
          </span>
        );
      })}
    </p>
  );
}
