'use client';

import { useMemo, useTransition } from 'react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { useTreeNavigation } from '@/lib/hooks/useTreeNavigation';
import {
  setRepertoireChoiceAction,
  clearRepertoireChoiceAction,
} from '@/app/repertoires/actions';
import { DiagramFrame, GhostButton, SecondaryButton, Stamp } from '@/components/ui/Premium';

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
    <div className="grid gap-10 lg:grid-cols-[minmax(360px,500px)_1fr] lg:gap-14">
      {/* ── Left page: the diagram ─────────────────────────── */}
      <div>
        <div className="mb-3 flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Diagram
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">
            {path.length === 0 ? 'starting' : `${path.length} ply deep`}
          </p>
        </div>

        <DiagramFrame caption={`§ ${path.length === 0 ? 'opening' : `move ${Math.ceil((path.length + 1) / 2)}`}`}>
          <ChessBoard fen={currentFen + ' 0 1'} orientation={orientation} lastMove={lastMove} />
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
            disabled={grouped.length === 0}
            className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink)] transition-colors duration-200 hover:bg-[color:var(--paper-deep)] disabled:cursor-not-allowed disabled:text-[color:var(--ink-ghost)]"
          >
            Forward ▶
          </button>
        </div>
      </div>

      {/* ── Right page: line + branches + annotation ───────── */}
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
            <ol className="notation mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[15px] leading-relaxed text-[color:var(--ink)]">
              {path.map((m, i) => (
                <li key={`${m.id}-${i}`}>
                  <button
                    onClick={() => goToIndex(i)}
                    className="rounded-none px-1 py-0.5 transition-colors duration-200 hover:bg-[color:var(--paper-deep)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
                  >
                    {m.colorToMove === 'black' && (
                      <span className="text-[color:var(--ink-faint)]">{m.moveNumber}.</span>
                    )}
                    {m.colorToMove === 'white' && (
                      <span className="text-[color:var(--ink-faint)]">{m.moveNumber}…</span>
                    )}{' '}
                    {m.san}
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
              Branches{grouped.length > 0 && ` · ${grouped.length}`}
            </p>
            {hasConflict && (
              <Stamp tone="red" rotate>
                Conflict
              </Stamp>
            )}
          </div>

          {hasConflict && (
            <p className="mt-3 marginalia text-[14px]">
              Two of your courses prepare different moves here. Choose which line wins
              for this repertoire — the others remain available as alternatives.
            </p>
          )}

          {grouped.length === 0 ? (
            <p className="mt-4 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
              End of line.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[color:var(--paper-rule)] border-y border-[color:var(--paper-edge)]">
              {grouped.map((g, i) => {
                const isPreferred = g.moves.some((m) => m.id === preferredMoveId);
                const repertoireMove = g.moves.find((m) => m.moveType === 'repertoire');
                const isRepertoire = !!repertoireMove;
                return (
                  <li
                    key={g.san}
                    className={`group grid grid-cols-[2.25rem_1fr_auto] items-baseline gap-4 px-2 py-3 transition-colors duration-200 hover:bg-[color:var(--paper-shade)] ${
                      isPreferred ? 'bg-[color:var(--paper-shade)]' : ''
                    }`}
                  >
                    <span
                      className="font-display text-base italic text-[color:var(--ink-faint)]"
                      style={{ fontFeatureSettings: '"onum"' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => playMove(g.moves[0])}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
                    >
                      <span className="notation text-base font-medium text-[color:var(--ink)]">
                        {g.san}
                      </span>
                      {isPreferred && <Stamp tone="green">preferred</Stamp>}
                      {isRepertoire && !isPreferred && <Stamp tone="ink">prep</Stamp>}
                      <span className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                        {g.moves.map((m) => (
                          <span key={m.id} title={`${m.courseName} · ${m.chapterName}`}>
                            {m.courseName}
                          </span>
                        ))}
                      </span>
                    </button>
                    {hasConflict && repertoireMove && (
                      <div className="flex items-center gap-3">
                        {isPreferred ? (
                          <GhostButton onClick={clearPreferred} disabled={pending}>
                            Clear
                          </GhostButton>
                        ) : (
                          <SecondaryButton
                            onClick={() => setPreferred(repertoireMove)}
                            disabled={pending}
                            className="px-3 py-1.5 text-[10px]"
                          >
                            Pick
                          </SecondaryButton>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Annotation marginalia */}
        {currentPosition?.annotation && (
          <section>
            <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Annotation
            </p>
            <p className="marginalia mt-4 text-[15px] leading-relaxed">
              {currentPosition.annotation}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
