/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';

const ChessBoard = dynamic(
  () => import('@/components/board/ChessBoard').then((m) => ({ default: m.ChessBoard })),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto aspect-square w-full max-w-none animate-pulse rounded bg-[color:var(--paper-rule)] md:max-w-[480px]" />
    ),
  },
);
import {
  AppSurface,
  PageHeader,
  PremiumButton,
  SecondaryButton,
  Stamp,
  StatTile,
} from '@/components/ui/Premium';
import { ResizableDiagramFrame } from '@/components/board/ResizableDiagramFrame';
import type { TrainingLine, LineStep } from './types';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { normalizeNotation } from '@/lib/chess/notation';

type MoveResult = { cardId: string; correct: boolean; responseTimeMs: number };

// browse → user freely navigates the line
// drill → two consecutive quiz runs (drillRun 1 then 2)
// line-done → both drills complete, FSRS submitted
type LinePhase = 'browse' | 'drill' | 'line-done';
type SessionPhase = 'playing' | 'done';

type Props = { initialLines: TrainingLine[] };

export function TrainingSession({ initialLines }: Props) {
  const [lines] = useState(initialLines);
  const [lineIndex, setLineIndex] = useState(0);
  const [linePhase, setLinePhase] = useState<LinePhase>('browse');
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('playing');

  // Browse-phase state
  const [browseIndex, setBrowseIndex] = useState(0); // 0 = start pos, k = after k moves

  // Drill-phase state
  const [drillRun, setDrillRun] = useState<1 | 2>(1);
  const [drill1Stats, setDrill1Stats] = useState<{ correct: number; wrong: number } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; text: string } | null>(null);
  const [lineResults, setLineResults] = useState<MoveResult[]>([]);
  const [moveStartTime, setMoveStartTime] = useState(0);
  const [lineCorrect, setLineCorrect] = useState(0);
  const [lineWrong, setLineWrong] = useState(0);

  // Board state
  const [boardFen, setBoardFen] = useState('');
  const [lastMoveUci, setLastMoveUci] = useState<[string, string] | undefined>();

  // Input state
  const [inputMode, setInputMode] = useState<'mouse' | 'keyboard'>('mouse');
  const [notationInput, setNotationInput] = useState('');
  const [notationError, setNotationError] = useState<string | null>(null);
  const [needsManualNext, setNeedsManualNext] = useState(false);
  const [tracePreviewIndex, setTracePreviewIndex] = useState<number | null>(null);
  const [queuedPremove, setQueuedPremove] = useState<{ from: string; to: string } | null>(null);
  const notationRef = useRef<HTMLInputElement>(null);
  const submitRatings = useMutation(api.training.submitLineRatings);

  const [sessionStats, setSessionStats] = useState({
    linesCompleted: 0,
    totalCorrect: 0,
    totalWrong: 0,
    startTime: Date.now(),
  });

  const line = lines[lineIndex] ?? null;
  const step: LineStep | null = line ? line.steps[stepIndex] ?? null : null;
  const playerColor = line?.courseColor ?? 'white';

  // Reset all state when a new line starts — always begin in browse
  useEffect(() => {
    if (!line) return;
    const firstFen = line.steps[0]?.parentFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
    setBoardFen(firstFen + ' 0 1');
    setBrowseIndex(0);
    setDrillRun(1);
    setDrill1Stats(null);
    setStepIndex(0);
    setLastMoveUci(undefined);
    setWaitingForUser(false);
    setShowAnnotation(false);
    setFeedback(null);
    setLineResults([]);
    setLineCorrect(0);
    setLineWrong(0);
    setNotationInput('');
    setNotationError(null);
    setNeedsManualNext(false);
    setTracePreviewIndex(null);
    setQueuedPremove(null);
    setLinePhase('browse');
  }, [line, lineIndex]);

  // BROWSE: sync board to browseIndex
  useEffect(() => {
    if (linePhase !== 'browse' || !line || line.steps.length === 0) return;
    if (browseIndex === 0) {
      setBoardFen(line.steps[0].parentFen + ' 0 1');
      setLastMoveUci(undefined);
    } else {
      const s = line.steps[browseIndex - 1];
      setBoardFen(s.childFen + ' 0 1');
      setLastMoveUci([s.uci.slice(0, 2), s.uci.slice(2, 4)]);
    }
  }, [linePhase, browseIndex, line]);

  // DRILL: advance opponent moves automatically, set waitingForUser for user moves
  useEffect(() => {
    if (linePhase !== 'drill' || !line) return;
    if (stepIndex >= line.steps.length) return; // handled by completion effect below

    const s = line.steps[stepIndex];
    if (feedback) return;

    if (!s.isUserMove) {
      setBoardFen(s.childFen + ' 0 1');
      setLastMoveUci([s.uci.slice(0, 2), s.uci.slice(2, 4)]);
      setShowAnnotation(!!s.annotation);
      const advance = setTimeout(() => {
        setShowAnnotation(false);
        setStepIndex((i) => i + 1);
      }, s.annotation ? 700 : 80);
      return () => clearTimeout(advance);
    }

    setWaitingForUser(true);
    setMoveStartTime(Date.now());
    if (inputMode === 'keyboard') {
      setTimeout(() => notationRef.current?.focus(), 50);
    }
  }, [linePhase, stepIndex, line, feedback, inputMode]);

  // DRILL COMPLETION: handle end of drill-1 (start drill-2) and end of drill-2 (line-done)
  useEffect(() => {
    if (linePhase !== 'drill' || !line) return;
    if (stepIndex < line.steps.length) return;
    if (feedback) return; // wait for feedback to clear before transitioning

    if (drillRun === 1) {
      // Save drill-1 stats and start drill-2 after a short pause
      setDrill1Stats({ correct: lineCorrect, wrong: lineWrong });
      const t = setTimeout(() => {
        setDrillRun(2);
        setStepIndex(0);
        const fen = line.steps[0]?.parentFen ?? '';
        setBoardFen(fen + ' 0 1');
        setLastMoveUci(undefined);
        setLineCorrect(0);
        setLineWrong(0);
        setLineResults([]);
        setFeedback(null);
        setShowAnnotation(false);
        setNeedsManualNext(false);
        setWaitingForUser(false);
        setTracePreviewIndex(null);
      }, 1400);
      return () => clearTimeout(t);
    } else {
      setLinePhase('line-done');
    }
  }, [linePhase, stepIndex, line, drillRun, feedback, lineCorrect, lineWrong]);

  // LINE-DONE: submit drill-2 ratings and update session stats
  useEffect(() => {
    if (linePhase !== 'line-done') return;
    if (lineResults.length > 0) {
      submitRatings({
        results: lineResults.map((r) => ({
          cardId: r.cardId as Id<'reviewCards'>,
          correct: r.correct,
          responseTimeMs: r.responseTimeMs,
        })),
      }).catch(() => undefined);
    }
    setSessionStats((s) => ({
      ...s,
      linesCompleted: s.linesCompleted + 1,
      totalCorrect: s.totalCorrect + lineCorrect,
      totalWrong: s.totalWrong + lineWrong,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePhase]);

  const tryMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!line || !step || linePhase !== 'drill') return;

      let targetStep: LineStep | null = null;
      if (waitingForUser && step.isUserMove) {
        targetStep = step;
      } else if (!waitingForUser && !step.isUserMove) {
        const maybeNext = line.steps[stepIndex + 1] ?? null;
        if (maybeNext?.isUserMove) targetStep = maybeNext;
      }
      if (!targetStep) return;

      try {
        const chess = new Chess(targetStep.parentFen + ' 0 1');
        const result = chess.move({ from, to, promotion: promotion ?? 'q' });
        if (!result) return;

        const playedUci = from + to + (result.promotion ?? '');
        const correct = playedUci === targetStep.uci || result.san === targetStep.san;

        const responseTimeMs = Date.now() - moveStartTime;
        if (targetStep.cardId) {
          setLineResults((prev) => [
            ...prev,
            { cardId: targetStep.cardId!, correct, responseTimeMs },
          ]);
        }
        if (correct) setLineCorrect((c) => c + 1);
        else setLineWrong((c) => c + 1);

        setBoardFen(targetStep.childFen + ' 0 1');
        setLastMoveUci([targetStep.uci.slice(0, 2), targetStep.uci.slice(2, 4)]);
        setWaitingForUser(false);
        setNotationInput('');
        setNotationError(null);
        setTracePreviewIndex(null);

        if (correct) {
          setFeedback({ type: 'correct', text: targetStep.san });
          setShowAnnotation(!!targetStep.annotation);
          setNeedsManualNext(false);
        } else {
          setFeedback({
            type: 'wrong',
            text: `You played ${result.san}. Correct: ${targetStep.san}`,
          });
          setShowAnnotation(!!targetStep.annotation);
          setNeedsManualNext(true);
        }

        if (correct) {
          const delay = targetStep.annotation ? 2000 : 800;
          setTimeout(() => {
            setFeedback(null);
            setShowAnnotation(false);
            setStepIndex((i) => {
              if (targetStep === step) return i + 1;
              return i + 2;
            });
          }, delay);
        }
      } catch {
        // invalid move
      }
    },
    [line, step, stepIndex, waitingForUser, linePhase, moveStartTime],
  );

  const onBoardMove = useCallback(
    (orig: string, dest: string) => tryMove(orig, dest),
    [tryMove],
  );

  const handleNotationSubmit = useCallback(() => {
    if (!step || !waitingForUser) return;
    const input = notationInput.trim();
    if (!input) return;

    try {
      const fen = step.parentFen + ' 0 1';
      const normalized = normalizeNotation(input, fen);
      const chess = new Chess(fen);
      const result = chess.move(normalized, { strict: false });
      if (!result) {
        setNotationError('Invalid move.');
        return;
      }
      tryMove(result.from, result.to, result.promotion ?? undefined);
    } catch {
      setNotationError('Invalid move.');
    }
  }, [step, waitingForUser, notationInput, tryMove]);

  const legalDests = useMemo(() => {
    if (!step || !waitingForUser || linePhase !== 'drill') return undefined;
    try {
      const chess = new Chess(step.parentFen + ' 0 1');
      const dests = new Map<string, string[]>();
      for (const move of chess.moves({ verbose: true })) {
        const arr = dests.get(move.from) ?? [];
        arr.push(move.to);
        dests.set(move.from, arr);
      }
      return dests;
    } catch {
      return undefined;
    }
  }, [step, waitingForUser, linePhase]);

  // Start drilling from the browse phase
  const startDrilling = useCallback(() => {
    if (!line) return;
    setLinePhase('drill');
    setDrillRun(1);
    setStepIndex(0);
    const fen = line.steps[0]?.parentFen ?? '';
    setBoardFen(fen + ' 0 1');
    setLastMoveUci(undefined);
    setFeedback(null);
    setShowAnnotation(false);
    setWaitingForUser(false);
    setLineCorrect(0);
    setLineWrong(0);
    setLineResults([]);
  }, [line]);

  const continueAfterWrong = useCallback(() => {
    if (!needsManualNext) return;
    setNeedsManualNext(false);
    setFeedback(null);
    setShowAnnotation(false);
    setTracePreviewIndex(null);
    setStepIndex((i) => i + 1);
  }, [needsManualNext]);

  const nextLine = () => {
    const next = lineIndex + 1;
    if (next >= lines.length) {
      setSessionPhase('done');
    } else {
      setLineIndex(next);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Browse navigation
      if (linePhase === 'browse' && line) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setBrowseIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          const next = browseIndex + 1;
          if (next <= line.steps.length) {
            setBrowseIndex(next);
          } else {
            startDrilling();
          }
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setBrowseIndex(0);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setBrowseIndex(line.steps.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          startDrilling();
          return;
        }
      }

      // Drill controls
      if (e.key === ' ' && needsManualNext && feedback?.type === 'wrong') {
        e.preventDefault();
        continueAfterWrong();
        return;
      }
      if (e.key === 'Tab' && waitingForUser) {
        e.preventDefault();
        setInputMode((m) => {
          const next = m === 'mouse' ? 'keyboard' : 'mouse';
          if (next === 'keyboard') setTimeout(() => notationRef.current?.focus(), 50);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [linePhase, browseIndex, line, waitingForUser, needsManualNext, feedback, startDrilling, continueAfterWrong]);

  useEffect(() => {
    if (!queuedPremove || !waitingForUser || !step?.isUserMove || linePhase !== 'drill' || needsManualNext) {
      return;
    }
    const { from, to } = queuedPremove;
    setQueuedPremove(null);
    const timer = window.setTimeout(() => {
      tryMove(from, to);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [queuedPremove, waitingForUser, step, linePhase, needsManualNext, tryMove]);

  // Lock scroll on large screens — content fits without scrolling
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => { main.style.overflowY = mq.matches ? 'hidden' : ''; };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      main.style.overflowY = '';
    };
  }, []);

  // ─── Session done ───────────────────────────────────────
  if (sessionPhase === 'done') {
    const elapsed = Math.round((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const total = sessionStats.totalCorrect + sessionStats.totalWrong;
    const accuracy = total > 0 ? Math.round((sessionStats.totalCorrect / total) * 100) : 0;
    return (
      <AppSurface>
        <PageHeader
          eyebrow="End of session — § fin"
          title={
            <>
              Session <span className="font-display-italic">closed</span>.
            </>
          }
          body="Your recall data has been written back into the schedule. The next review will appear when memory is due."
        />
        <div className="grid grid-cols-2 gap-x-2 gap-y-8 border-y border-[color:var(--paper-edge)] py-8 md:grid-cols-5">
          <StatTile label="Lines drilled" value={sessionStats.linesCompleted} />
          <StatTile label="Moves correct" value={sessionStats.totalCorrect} tone="green" />
          <StatTile label="Moves wrong" value={sessionStats.totalWrong} tone="red" />
          <StatTile
            label="Accuracy"
            value={total > 0 ? `${accuracy}%` : '—'}
            tone={accuracy >= 80 ? 'green' : accuracy >= 50 ? 'gold' : 'red'}
          />
          <StatTile label="Elapsed" value={`${minutes}m ${seconds}s`} />
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <PremiumButton onClick={() => window.location.reload()}>Train again</PremiumButton>
          <SecondaryButton href="/courses">Back to library</SecondaryButton>
        </div>
      </AppSurface>
    );
  }

  if (!line) return null;

  const userMovesInLine = line.steps.filter((s) => s.isUserMove).length;
  const playedUserMoves = lineCorrect + lineWrong;

  // Detect between-drills transition window (drill-1 done, timer running for drill-2)
  const betweenDrills =
    linePhase === 'drill' &&
    drillRun === 1 &&
    stepIndex >= line.steps.length &&
    !feedback;

  const lineProgress =
    linePhase === 'browse'
      ? Math.round((browseIndex / Math.max(line.steps.length, 1)) * 100)
      : linePhase === 'line-done'
        ? 100
        : Math.round((playedUserMoves / Math.max(userMovesInLine, 1)) * 100);

  const phaseLabel =
    linePhase === 'browse'
      ? `Study · ${browseIndex}/${line.steps.length}`
      : linePhase === 'line-done'
        ? 'Line complete'
        : betweenDrills
          ? 'Starting drill 2…'
          : waitingForUser
            ? `Your move · ${playerColor}`
            : `Drill ${drillRun}/2`;

  // Browse: annotation for the current position (always visible)
  const browseAnnotation =
    linePhase === 'browse' && browseIndex > 0
      ? line.steps[browseIndex - 1]?.annotation ?? null
      : null;

  // Drill trace tokens (played moves so far in current drill)
  const traceUpTo =
    linePhase === 'line-done'
      ? line.steps.length
      : Math.min(stepIndex + (waitingForUser ? 0 : 1), line.steps.length);
  const drillTraceTokens = line.steps.slice(0, traceUpTo).map((s, i) => {
    const sideToMove = s.parentFen.split(/\s+/)[1] === 'w' ? 'white' : 'black';
    const prefix = sideToMove === 'white' ? `${s.moveNumber}.` : '';
    return {
      key: `${i}-${s.uci}`,
      text: `${prefix}${s.san}`,
      childFen: s.childFen,
      uci: s.uci,
      index: i,
    };
  });

  // Browse trace tokens (full line, all steps)
  const browseTraceTokens = line.steps.map((s, i) => {
    const sideToMove = s.parentFen.split(/\s+/)[1] === 'w' ? 'white' : 'black';
    const prefix = sideToMove === 'white' ? `${s.moveNumber}.` : '';
    return {
      key: `browse-${i}-${s.uci}`,
      text: `${prefix}${s.san}`,
      childFen: s.childFen,
      uci: s.uci,
      index: i, // browseIndex = i + 1 when this move is selected
      hasAnnotation: Boolean(s.annotation?.trim()),
    };
  });

  return (
    <AppSurface>
      {/* Header ribbon */}
      <div className="mb-6 grid items-baseline gap-3 border-b border-[color:var(--paper-edge)] pb-3 md:grid-cols-[auto_1fr_auto] md:gap-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Training · Line{' '}
          <span className="font-display italic text-[color:var(--ink)]">
            {lineIndex + 1}
          </span>{' '}
          of {lines.length}
        </p>
        <p className="truncate font-display-italic text-[15px] text-[color:var(--ink-soft)]">
          {line.courseName} <span className="text-[color:var(--ink-ghost)]">·</span> {line.chapterName}
        </p>
        <div className="flex items-center gap-3">
          <Stamp
            tone={
              linePhase === 'browse'
                ? 'gold'
                : linePhase === 'line-done'
                  ? 'green'
                  : betweenDrills
                    ? 'gold'
                    : drillRun === 1
                      ? 'red'
                      : 'red'
            }
          >
            {linePhase === 'browse'
              ? 'Study'
              : linePhase === 'line-done'
                ? 'Done'
                : betweenDrills
                  ? 'Drill 1 done'
                  : `Drill ${drillRun}/2`}
          </Stamp>
          {linePhase === 'drill' && !betweenDrills && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] tabular-nums">
              {playedUserMoves}/{userMovesInLine}
            </span>
          )}
        </div>
      </div>

      {/* Progress hairline */}
      <div className="mb-10 h-px bg-[color:var(--paper-rule)]">
        <div
          className="h-full bg-[color:var(--margin-red)] transition-[width] duration-500 ease-out"
          style={{ width: `${lineProgress}%` }}
        />
      </div>

      {linePhase === 'line-done' && (
        <div className="mb-6 flex justify-start">
          <PremiumButton onClick={nextLine}>
            {lineIndex + 1 < lines.length ? 'Next line' : 'Finish session'}
          </PremiumButton>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[auto_minmax(420px,1fr)] lg:gap-14">
        {/* Board column */}
        <div>
          <div className="mb-3 flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Diagram
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">
              {phaseLabel}
            </p>
          </div>

          <div className="-mx-5 md:mx-0">
            <ResizableDiagramFrame
              caption={
                linePhase === 'browse'
                  ? `Move ${browseIndex} / ${line.steps.length}`
                  : `Move ${stepIndex + 1} / ${line.steps.length}`
              }
            >
              <ChessBoard
                fen={boardFen}
                orientation={playerColor}
                viewOnly={linePhase === 'browse' || betweenDrills}
                lastMove={lastMoveUci}
                movable={
                  linePhase === 'drill' && !betweenDrills && inputMode === 'mouse'
                    ? waitingForUser
                      ? { free: false, dests: legalDests, color: playerColor, showDests: true }
                      : { free: false, color: playerColor, showDests: true }
                    : undefined
                }
                premovable={{ enabled: linePhase === 'drill' && !betweenDrills }}
                onMove={onBoardMove}
                onPremoveSet={(orig, dest) => {
                  setQueuedPremove({ from: orig, to: dest });
                }}
                arrows={
                  feedback?.type === 'wrong' && step
                    ? [{ orig: step.uci.slice(0, 2), dest: step.uci.slice(2, 4), brush: 'green' }]
                    : undefined
                }
              />
            </ResizableDiagramFrame>
          </div>

          {/* Browse navigation controls */}
          {linePhase === 'browse' && (
            <div className="mt-6">
              <div className="grid grid-cols-3 divide-x divide-[color:var(--paper-edge)] border border-[color:var(--paper-edge)]">
                <button
                  type="button"
                  onClick={() => setBrowseIndex((i) => Math.max(0, i - 1))}
                  disabled={browseIndex === 0}
                  className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 hover:bg-[color:var(--paper-deep)] disabled:opacity-30"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = browseIndex + 1;
                    if (next <= line.steps.length) setBrowseIndex(next);
                    else startDrilling();
                  }}
                  className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 hover:bg-[color:var(--paper-deep)]"
                >
                  {browseIndex >= line.steps.length ? 'Drill →' : 'Forward →'}
                </button>
                <button
                  type="button"
                  onClick={startDrilling}
                  className="bg-[color:var(--ink)] px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] transition-colors duration-200 hover:opacity-90"
                >
                  Start drill
                </button>
              </div>
            </div>
          )}

          {/* Browse annotation — narrow screens only; lg+ sees it in the right column */}
          {linePhase === 'browse' && browseAnnotation && (
            <section className="mt-4 lg:hidden">
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Annotation
              </p>
              <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">
                {browseAnnotation}
              </p>
            </section>
          )}

          {/* Drill input controls */}
          {linePhase === 'drill' && !betweenDrills && waitingForUser && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 divide-x divide-[color:var(--paper-edge)] border border-[color:var(--paper-edge)]">
                {(['mouse', 'keyboard'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setInputMode(mode);
                      if (mode === 'keyboard') setTimeout(() => notationRef.current?.focus(), 50);
                    }}
                    className={`px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 ${inputMode === mode
                        ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
                        : 'text-[color:var(--ink)] hover:bg-[color:var(--paper-deep)]'
                      }`}
                  >
                    {mode === 'mouse' ? 'Board' : 'Notation'}
                  </button>
                ))}
              </div>
              {inputMode === 'keyboard' && (
                <div className="flex items-baseline gap-3 border-b border-[color:var(--paper-edge)] pb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                    →
                  </span>
                  <input
                    ref={notationRef}
                    type="text"
                    value={notationInput}
                    onChange={(e) => {
                      setNotationInput(e.target.value);
                      setNotationError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNotationSubmit();
                      }
                    }}
                    placeholder="e.g. Nf3"
                    className="notation flex-1 bg-transparent text-lg text-[color:var(--ink)] placeholder:text-[color:var(--ink-ghost)] focus:outline-none"
                    autoFocus
                  />
                  <SecondaryButton onClick={handleNotationSubmit}>Play</SecondaryButton>
                </div>
              )}
              {notationError && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-display-italic text-sm text-[color:var(--margin-red)]">
                    {notationError}
                  </p>
                  <Link
                    href="/documentation/notation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[5px] transition-colors duration-200 hover:text-[color:var(--library-green)] hover:decoration-[color:var(--library-green)]"
                  >
                    What notation is accepted?
                  </Link>
                </div>
              )}
            </div>
          )}

          {needsManualNext && feedback?.type === 'wrong' && (
            <div className="mt-4">
              <PremiumButton onClick={continueAfterWrong}>Continue</PremiumButton>
            </div>
          )}

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">
            {linePhase === 'browse'
              ? <>
                  <kbd className="font-mono">↑↓</kbd> first/last ·{' '}
                  <kbd className="font-mono">←→</kbd> navigate ·{' '}
                  <kbd className="font-mono">enter</kbd> drill
                </>
              : <>
                  <kbd className="font-mono">tab</kbd> toggle input ·{' '}
                  <kbd className="font-mono">enter</kbd> submit ·{' '}
                  <kbd className="font-mono">space</kbd> continue
                </>
            }
          </p>
        </div>

        {/* Right column: prompt, feedback, annotation, trace */}
        <div className="space-y-10">
          {/* Prompt */}
          <section>
            <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Prompt
            </p>
            <p className="mt-5 font-display text-3xl font-medium leading-[1.15] tracking-[-0.01em] text-[color:var(--ink)] md:text-4xl">
              {linePhase === 'browse' ? (
                browseIndex === 0 ? (
                  <>
                    Study this <span className="font-display-italic">line</span>.
                  </>
                ) : browseIndex >= line.steps.length ? (
                  <>
                    End of line — ready to <span className="font-display-italic">drill?</span>
                  </>
                ) : (
                  <>
                    Move {browseIndex} of {line.steps.length}.
                  </>
                )
              ) : linePhase === 'line-done' ? (
                lineWrong === 0 ? (
                  <>
                    A <span className="font-display-italic">perfect</span> line.
                  </>
                ) : (
                  <>
                    {lineCorrect}/{lineCorrect + lineWrong}{' '}
                    <span className="font-display-italic">correct</span>.
                  </>
                )
              ) : betweenDrills ? (
                <>
                  Drill 1 complete — <span className="font-display-italic">resetting…</span>
                </>
              ) : waitingForUser ? (
                <>
                  Your turn — move {playedUserMoves + 1} of {userMovesInLine}.
                </>
              ) : (
                <>
                  Opponent <span className="font-display-italic">replies…</span>
                </>
              )}
            </p>
            <p className="mt-3 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
              {linePhase === 'browse'
                ? 'Navigate with ← → · read the annotations · press Enter or Start drill when ready.'
                : linePhase === 'line-done'
                  ? 'Review the result, then continue.'
                  : betweenDrills
                    ? `Drill 1: ${drill1Stats?.correct ?? 0}/${(drill1Stats?.correct ?? 0) + (drill1Stats?.wrong ?? 0)} correct. Starting drill 2…`
                    : waitingForUser
                      ? inputMode === 'keyboard'
                        ? 'Type the prepared move in algebraic notation.'
                        : 'Find the prepared move on the board.'
                      : 'The opponent is replying…'}
            </p>
          </section>

          {/* Feedback (drill only) */}
          {feedback && (
            <section
              className={`border-l-2 pl-4 ${feedback.type === 'correct'
                  ? 'border-[color:var(--library-green)]'
                  : 'border-[color:var(--margin-red)]'
                }`}
            >
              <p
                className={`font-mono text-[10px] uppercase tracking-[0.22em] ${feedback.type === 'correct'
                    ? 'text-[color:var(--library-green)]'
                    : 'text-[color:var(--margin-red)]'
                  }`}
              >
                {feedback.type === 'correct' ? '✓ Correct' : '✗ Departure from prep'}
              </p>
              <p className="notation mt-2 text-[15px] text-[color:var(--ink)]">
                {feedback.text}
              </p>
            </section>
          )}

          {/* Browse annotation — always visible, full text */}
          {linePhase === 'browse' && browseAnnotation && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Annotation
              </p>
              <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">
                {browseAnnotation}
              </p>
            </section>
          )}

          {/* Drill annotation (brief) */}
          {linePhase === 'drill' && showAnnotation && step?.annotation && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Annotation
              </p>
              <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">
                {step.annotation}
              </p>
            </section>
          )}

          {/* Browse: full line trace — clickable */}
          {linePhase === 'browse' && browseTraceTokens.length > 0 && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Line
              </p>
              <ol className="mt-4 flex flex-wrap gap-2">
                {browseTraceTokens.map((token) => (
                  <li
                    key={token.key}
                    className={`notation cursor-pointer rounded-lg px-2.5 py-1 text-[16px] leading-none transition-colors duration-150 md:text-[17px] ${
                      browseIndex === token.index + 1
                        ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
                        : line.steps[token.index]?.isUserMove
                          ? 'bg-[color:var(--paper-deep)] text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]'
                          : token.hasAnnotation
                            ? 'bg-[color:var(--library-green)]/15 text-[color:var(--library-green)] hover:bg-[color:var(--library-green)]/25'
                            : 'bg-transparent text-[color:var(--ink-soft)] hover:bg-[color:var(--paper-edge)]'
                    }`}
                    onClick={() => setBrowseIndex(token.index + 1)}
                  >
                    {token.text}
                  </li>
                ))}
              </ol>
              <p className="mt-3 font-mono text-[10px] text-[color:var(--ink-ghost)]">
                Your moves highlighted · green marks annotation · click to jump
              </p>
            </section>
          )}

          {/* Drill: move trace — clickable when reviewing wrong move */}
          {linePhase === 'drill' && drillTraceTokens.length > 0 && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Trace
              </p>
              <ol className="mt-4 flex flex-wrap gap-2">
                {drillTraceTokens.map((token) => (
                  <li
                    key={token.key}
                    className={`notation rounded-lg px-2.5 py-1 text-[16px] leading-none transition-colors duration-150 md:text-[17px] ${
                      tracePreviewIndex === token.index
                        ? 'bg-[color:var(--ink-faint)] text-[color:var(--paper)]'
                        : 'bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]'
                    } ${needsManualNext && feedback?.type === 'wrong' ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => {
                      if (!(needsManualNext && feedback?.type === 'wrong')) return;
                      setTracePreviewIndex(token.index);
                      setBoardFen(token.childFen + ' 0 1');
                      setLastMoveUci([token.uci.slice(0, 2), token.uci.slice(2, 4)]);
                    }}
                  >
                    {token.text}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Line done — both drill results */}
          {linePhase === 'line-done' && (
            <section>
              <div className="grid grid-cols-2 gap-x-2 gap-y-6 border-y border-[color:var(--paper-edge)] py-6 md:grid-cols-4">
                {drill1Stats && (
                  <>
                    <StatTile
                      label="Drill 1 correct"
                      value={drill1Stats.correct}
                      tone="green"
                    />
                    <StatTile
                      label="Drill 1 wrong"
                      value={drill1Stats.wrong}
                      tone={drill1Stats.wrong === 0 ? 'green' : 'red'}
                    />
                  </>
                )}
                <StatTile label="Drill 2 correct" value={lineCorrect} tone="green" />
                <StatTile
                  label="Drill 2 wrong"
                  value={lineWrong}
                  tone={lineWrong === 0 ? 'green' : 'red'}
                />
              </div>
              <div className="mt-6">
                <PremiumButton onClick={nextLine}>
                  {lineIndex + 1 < lines.length ? 'Next line' : 'Finish session'}
                </PremiumButton>
              </div>
            </section>
          )}

          {/* Session running totals */}
          <section className="border-t border-[color:var(--paper-rule)] pt-6">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[2rem] font-semibold leading-none tabular-nums text-[color:var(--ink)]">
                {sessionStats.linesCompleted}
              </span>
              <span className="text-[13px] text-[color:var(--ink-soft)]">done</span>
              <span className="text-[color:var(--ink-ghost)]">/</span>
              <span className="text-[15px] tabular-nums text-[color:var(--ink-faint)]">
                {lines.length}
              </span>
              <span className="text-[13px] text-[color:var(--ink-ghost)]">lines</span>
              {lines.length - sessionStats.linesCompleted > 0 && (
                <>
                  <span className="ml-1 text-[color:var(--ink-ghost)]">·</span>
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--margin-red)]">
                    {lines.length - sessionStats.linesCompleted} left
                  </span>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppSurface>
  );
}
