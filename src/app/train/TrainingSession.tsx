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
      <div className="mx-auto aspect-square w-full max-w-[480px] animate-pulse rounded bg-[color:var(--paper-rule)]" />
    ),
  },
);
import {
  AppSurface,
  DiagramFrame,
  GhostButton,
  PageHeader,
  PremiumButton,
  SecondaryButton,
  Stamp,
  StatTile,
  fieldClassName,
} from '@/components/ui/Premium';
import { submitLineRatings } from './submitRatings';
import type { TrainingLine, LineStep } from './types';

type MoveResult = { cardId: string; correct: boolean; responseTimeMs: number };

type LinePhase = 'learn' | 'drill' | 'line-done';
type SessionPhase = 'playing' | 'done';

type Props = { initialLines: TrainingLine[] };

export function TrainingSession({ initialLines }: Props) {
  const [lines] = useState(initialLines);
  const [lineIndex, setLineIndex] = useState(0);
  const [linePhase, setLinePhase] = useState<LinePhase>(
    initialLines[0]?.isNew ? 'learn' : 'drill',
  );
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('playing');

  const [stepIndex, setStepIndex] = useState(0);
  const [boardFen, setBoardFen] = useState('');
  const [lastMoveUci, setLastMoveUci] = useState<[string, string] | undefined>();
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; text: string } | null>(null);
  const [lineResults, setLineResults] = useState<MoveResult[]>([]);
  const [moveStartTime, setMoveStartTime] = useState(0);

  const [inputMode, setInputMode] = useState<'mouse' | 'keyboard'>('mouse');
  const [notationInput, setNotationInput] = useState('');
  const [notationError, setNotationError] = useState<string | null>(null);
  const notationRef = useRef<HTMLInputElement>(null);

  const [sessionStats, setSessionStats] = useState({
    linesCompleted: 0,
    totalCorrect: 0,
    totalWrong: 0,
    startTime: Date.now(),
  });

  const line = lines[lineIndex] ?? null;
  const step: LineStep | null = line ? line.steps[stepIndex] ?? null : null;
  const playerColor = line?.courseColor ?? 'white';

  useEffect(() => {
    if (!line) return;
    const firstFen = line.steps[0]?.parentFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
    setBoardFen(firstFen + ' 0 1');
    setStepIndex(0);
    setLastMoveUci(undefined);
    setWaitingForUser(false);
    setShowAnnotation(false);
    setFeedback(null);
    setLineResults([]);
    setNotationInput('');
    setNotationError(null);
    setLinePhase(line.isNew ? 'learn' : 'drill');
  }, [line, lineIndex]);

  // LEARN: auto-play through line
  useEffect(() => {
    if (linePhase !== 'learn' || !line) return;
    if (stepIndex >= line.steps.length) {
      setStepIndex(0);
      const firstFen = line.steps[0]?.parentFen ?? '';
      setBoardFen(firstFen + ' 0 1');
      setLastMoveUci(undefined);
      setShowAnnotation(false);
      setLinePhase('drill');
      return;
    }

    const s = line.steps[stepIndex];
    const timer = setTimeout(() => {
      setBoardFen(s.childFen + ' 0 1');
      setLastMoveUci([s.uci.slice(0, 2), s.uci.slice(2, 4)]);
      setShowAnnotation(!!s.annotation);

      const advanceTimer = setTimeout(() => {
        setShowAnnotation(false);
        setStepIndex((i) => i + 1);
      }, s.annotation ? 2500 : 1000);

      return () => clearTimeout(advanceTimer);
    }, stepIndex === 0 ? 500 : 800);

    return () => clearTimeout(timer);
  }, [linePhase, stepIndex, line]);

  // DRILL
  useEffect(() => {
    if (linePhase !== 'drill' || !line) return;
    if (stepIndex >= line.steps.length) {
      setLinePhase('line-done');
      return;
    }

    const s = line.steps[stepIndex];
    if (feedback) return;

    if (!s.isUserMove) {
      const timer = setTimeout(() => {
        setBoardFen(s.childFen + ' 0 1');
        setLastMoveUci([s.uci.slice(0, 2), s.uci.slice(2, 4)]);
        setShowAnnotation(!!s.annotation);
        const advance = setTimeout(() => {
          setShowAnnotation(false);
          setStepIndex((i) => i + 1);
        }, s.annotation ? 1500 : 600);
        return () => clearTimeout(advance);
      }, 400);
      return () => clearTimeout(timer);
    }

    setWaitingForUser(true);
    setMoveStartTime(Date.now());
    if (inputMode === 'keyboard') {
      setTimeout(() => notationRef.current?.focus(), 50);
    }
  }, [linePhase, stepIndex, line, feedback, inputMode]);

  useEffect(() => {
    if (linePhase !== 'line-done') return;
    if (lineResults.length > 0) {
      submitLineRatings(lineResults);
    }
    setSessionStats((s) => ({
      ...s,
      linesCompleted: s.linesCompleted + 1,
      totalCorrect: s.totalCorrect + lineResults.filter((r) => r.correct).length,
      totalWrong: s.totalWrong + lineResults.filter((r) => !r.correct).length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePhase]);

  const tryMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!step || !waitingForUser || linePhase !== 'drill') return;

      try {
        const chess = new Chess(step.parentFen + ' 0 1');
        const result = chess.move({ from, to, promotion: promotion ?? 'q' });
        if (!result) return;

        const playedUci = from + to + (result.promotion ?? '');
        const correct = playedUci === step.uci || result.san === step.san;

        const responseTimeMs = Date.now() - moveStartTime;
        if (step.cardId) {
          setLineResults((prev) => [
            ...prev,
            { cardId: step.cardId!, correct, responseTimeMs },
          ]);
        }

        setBoardFen(step.childFen + ' 0 1');
        setLastMoveUci([step.uci.slice(0, 2), step.uci.slice(2, 4)]);
        setWaitingForUser(false);
        setNotationInput('');
        setNotationError(null);

        if (correct) {
          setFeedback({ type: 'correct', text: step.san });
          setShowAnnotation(!!step.annotation);
        } else {
          setFeedback({
            type: 'wrong',
            text: `You played ${result.san}. Correct: ${step.san}`,
          });
          setShowAnnotation(!!step.annotation);
        }

        const delay = step.annotation ? 2000 : correct ? 800 : 1800;
        setTimeout(() => {
          setFeedback(null);
          setShowAnnotation(false);
          setStepIndex((i) => i + 1);
        }, delay);
      } catch {
        // invalid
      }
    },
    [step, waitingForUser, linePhase, moveStartTime],
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
      const chess = new Chess(step.parentFen + ' 0 1');
      const result = chess.move(input, { strict: false });
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
  }, [waitingForUser]);

  const nextLine = () => {
    const next = lineIndex + 1;
    if (next >= lines.length) {
      setSessionPhase('done');
    } else {
      setLineIndex(next);
    }
  };

  const skipLearn = () => {
    if (!line) return;
    setStepIndex(0);
    const firstFen = line.steps[0]?.parentFen ?? '';
    setBoardFen(firstFen + ' 0 1');
    setLastMoveUci(undefined);
    setShowAnnotation(false);
    setLinePhase('drill');
  };

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
  const correctInLine = lineResults.filter((r) => r.correct).length;
  const wrongInLine = lineResults.filter((r) => !r.correct).length;
  const playedUserMoves = correctInLine + wrongInLine;
  const lineProgress =
    linePhase === 'learn'
      ? Math.round((Math.min(stepIndex, line.steps.length) / Math.max(line.steps.length, 1)) * 100)
      : linePhase === 'line-done'
        ? 100
        : Math.round((playedUserMoves / Math.max(userMovesInLine, 1)) * 100);

  const phaseLabel =
    linePhase === 'learn'
      ? 'Watch first'
      : linePhase === 'line-done'
        ? 'Line complete'
        : waitingForUser
          ? `Your move · ${playerColor}`
          : 'Opponent';

  const promptCopy =
    linePhase === 'learn'
      ? 'Watch the line once, then drill it from memory.'
      : linePhase === 'line-done'
        ? 'Review the result, then continue.'
        : waitingForUser
          ? inputMode === 'keyboard'
            ? 'Type the prepared move in algebraic notation.'
            : 'Find the prepared move on the board.'
          : 'The opponent is replying…';

  return (
    <AppSurface>
      {/* Header ribbon — book-style line meta */}
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
          <Stamp tone={linePhase === 'learn' ? 'gold' : linePhase === 'drill' ? 'red' : 'green'}>
            {linePhase === 'learn' ? 'New · learn' : linePhase === 'drill' ? 'Drill' : 'Done'}
          </Stamp>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] tabular-nums">
            {playedUserMoves}/{userMovesInLine}
          </span>
        </div>
      </div>

      {/* Progress hairline */}
      <div className="mb-10 h-px bg-[color:var(--paper-rule)]">
        <div
          className="h-full bg-[color:var(--margin-red)] transition-[width] duration-500 ease-out"
          style={{ width: `${lineProgress}%` }}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(360px,520px)_1fr] lg:gap-14">
        {/* Diagram column */}
        <div>
          <div className="mb-3 flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Diagram
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">
              {phaseLabel}
            </p>
          </div>

          <DiagramFrame caption={`Move ${stepIndex + 1} / ${line.steps.length}`}>
            <ChessBoard
              fen={boardFen}
              orientation={playerColor}
              viewOnly={!waitingForUser}
              lastMove={lastMoveUci}
              movable={
                waitingForUser && inputMode === 'mouse'
                  ? { free: false, dests: legalDests, color: playerColor, showDests: true }
                  : undefined
              }
              onMove={onBoardMove}
              arrows={
                feedback?.type === 'wrong' && step
                  ? [{ orig: step.uci.slice(0, 2), dest: step.uci.slice(2, 4), brush: 'green' }]
                  : undefined
              }
            />
          </DiagramFrame>

          {/* Input controls */}
          {waitingForUser && (
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

          {linePhase === 'learn' && (
            <div className="mt-6">
              <SecondaryButton onClick={skipLearn}>Skip to drill</SecondaryButton>
            </div>
          )}

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">
            <kbd className="font-mono">tab</kbd> toggle input ·{' '}
            <kbd className="font-mono">enter</kbd> submit
          </p>
        </div>

        {/* Right column: prompt, feedback, marginalia, trace */}
        <div className="space-y-10">
          {/* Prompt */}
          <section>
            <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Prompt
            </p>
            <p className="mt-5 font-display text-3xl font-medium leading-[1.15] tracking-[-0.01em] text-[color:var(--ink)] md:text-4xl">
              {linePhase === 'learn' ? (
                <>
                  Watch <span className="font-display-italic">once</span>, then drill from memory.
                </>
              ) : linePhase === 'line-done' ? (
                wrongInLine === 0 ? (
                  <>
                    A <span className="font-display-italic">perfect</span> line.
                  </>
                ) : (
                  <>
                    {correctInLine}/{correctInLine + wrongInLine} <span className="font-display-italic">correct</span>.
                  </>
                )
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
              {promptCopy}
            </p>
          </section>

          {/* Feedback */}
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

          {/* Annotation marginalia */}
          {showAnnotation && step?.annotation && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Annotation
              </p>
              <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">
                {step.annotation}
              </p>
            </section>
          )}

          {/* Move trace — render played moves like a notation column */}
          {linePhase === 'drill' && lineResults.length > 0 && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Trace
              </p>
              <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {lineResults.map((r, i) => (
                  <li
                    key={i}
                    className={`notation text-[14px] tabular-nums ${r.correct ? 'text-[color:var(--library-green)]' : 'text-[color:var(--margin-red)] line-through'
                      }`}
                  >
                    <span className="text-[color:var(--ink-faint)]">{i + 1}.</span> {r.correct ? '✓' : '✗'}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Line done */}
          {linePhase === 'line-done' && (
            <section>
              <div className="grid grid-cols-2 gap-x-2 gap-y-6 border-y border-[color:var(--paper-edge)] py-6">
                <StatTile label="Correct" value={correctInLine} tone="green" />
                <StatTile label="Wrong" value={wrongInLine} tone={wrongInLine === 0 ? 'green' : 'red'} />
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
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Session totals
            </p>
            <div className="grid grid-cols-3 gap-x-2">
              <StatTile
                label="Lines"
                value={sessionStats.linesCompleted}
                hint="completed"
              />
              <StatTile
                label="Correct"
                value={sessionStats.totalCorrect + correctInLine}
                tone="green"
              />
              <StatTile
                label="Wrong"
                value={sessionStats.totalWrong + wrongInLine}
                tone="red"
              />
            </div>
          </section>
        </div>
      </div>
    </AppSurface>
  );
}
