/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '@/components/board/ChessBoard';
import {
  AppSurface,
  PageHeader,
  PremiumButton,
  PremiumPanel,
  SecondaryButton,
  StatTile,
  fieldClassName,
} from '@/components/ui/Premium';
import { submitLineRatings } from './actions';
import type { TrainingLine, LineStep } from '@/lib/srs/lines';

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

  // Per-line state
  const [stepIndex, setStepIndex] = useState(0);
  const [boardFen, setBoardFen] = useState('');
  const [lastMoveUci, setLastMoveUci] = useState<[string, string] | undefined>();
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; text: string } | null>(null);
  const [lineResults, setLineResults] = useState<MoveResult[]>([]);
  const [moveStartTime, setMoveStartTime] = useState(0);

  // Input mode
  const [inputMode, setInputMode] = useState<'mouse' | 'keyboard'>('mouse');
  const [notationInput, setNotationInput] = useState('');
  const [notationError, setNotationError] = useState<string | null>(null);
  const notationRef = useRef<HTMLInputElement>(null);

  // Session-wide stats
  const [sessionStats, setSessionStats] = useState({
    linesCompleted: 0,
    totalCorrect: 0,
    totalWrong: 0,
    startTime: Date.now(),
  });

  const line = lines[lineIndex] ?? null;
  const step: LineStep | null = line ? line.steps[stepIndex] ?? null : null;
  const playerColor = line?.courseColor ?? 'white';

  // Initialize line
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

  // ─── LEARN MODE: auto-play through the line ────────────────────
  useEffect(() => {
    if (linePhase !== 'learn' || !line) return;
    if (stepIndex >= line.steps.length) {
      // Learn done, switch to drill
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

      // After showing this move, advance
      const advanceTimer = setTimeout(() => {
        setShowAnnotation(false);
        setStepIndex((i) => i + 1);
      }, s.annotation ? 2500 : 1000);

      return () => clearTimeout(advanceTimer);
    }, stepIndex === 0 ? 500 : 800);

    return () => clearTimeout(timer);
  }, [linePhase, stepIndex, line]);

  // ─── DRILL MODE: alternate between opponent auto-play and user input ──
  useEffect(() => {
    if (linePhase !== 'drill' || !line) return;
    if (stepIndex >= line.steps.length) {
      setLinePhase('line-done');
      return;
    }

    const s = line.steps[stepIndex];

    if (feedback) return; // showing feedback, wait for advance

    if (!s.isUserMove) {
      // Opponent move — auto-play after a short delay
      const timer = setTimeout(() => {
        setBoardFen(s.childFen + ' 0 1');
        setLastMoveUci([s.uci.slice(0, 2), s.uci.slice(2, 4)]);
        setShowAnnotation(!!s.annotation);
        // Auto-advance after showing opponent move
        const advance = setTimeout(() => {
          setShowAnnotation(false);
          setStepIndex((i) => i + 1);
        }, s.annotation ? 1500 : 600);
        return () => clearTimeout(advance);
      }, 400);
      return () => clearTimeout(timer);
    }

    // User move — wait for input
    setWaitingForUser(true);
    setMoveStartTime(Date.now());
    if (inputMode === 'keyboard') {
      setTimeout(() => notationRef.current?.focus(), 50);
    }
  }, [linePhase, stepIndex, line, feedback, inputMode]);

  // ─── LINE DONE: submit ratings ──────────────────────────────────
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

  // ─── Move validation ────────────────────────────────────────────
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

        // Auto-advance after feedback
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

  // Legal dests for mouse input
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

  // Tab to toggle input mode
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

  // ─── RENDER ─────────────────────────────────────────────────────

  if (sessionPhase === 'done') {
    const elapsed = Math.round((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const total = sessionStats.totalCorrect + sessionStats.totalWrong;
    return (
      <AppSurface>
        <PageHeader
          eyebrow="Review complete"
          title="Session complete"
          body="Your recall data has been submitted back into the scheduler."
        />
        <div className="grid max-w-5xl gap-3 md:grid-cols-5">
          <StatTile label="Lines drilled" value={sessionStats.linesCompleted} />
          <StatTile label="Moves correct" value={sessionStats.totalCorrect} tone="green" />
          <StatTile label="Moves wrong" value={sessionStats.totalWrong} tone="red" />
          <StatTile
            label="Accuracy"
            value={total > 0 ? `${Math.round((sessionStats.totalCorrect / total) * 100)}%` : '-'}
            tone="gold"
          />
          <StatTile label="Time" value={`${minutes}m ${seconds}s`} />
        </div>
        <PremiumButton onClick={() => window.location.reload()} className="mt-8">
          Train again
        </PremiumButton>
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
  const actionCopy =
    linePhase === 'learn'
      ? 'Watch the continuation once, then drill it from memory.'
      : linePhase === 'line-done'
        ? 'Review the result, then continue to the next line.'
        : waitingForUser
          ? inputMode === 'keyboard'
            ? 'Type the prepared move in algebraic notation.'
            : 'Play the prepared move on the board.'
          : 'Opponent move is being played.';

  return (
    <AppSurface>
      <PageHeader
        eyebrow={`Line ${lineIndex + 1} of ${lines.length}`}
        title={linePhase === 'learn' ? 'Learn the line' : linePhase === 'drill' ? 'Find the move' : 'Line complete'}
        body={`${line.courseName} · ${line.chapterName}. ${userMovesInLine} moves to play as ${playerColor}.`}
        action={
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Correct" value={sessionStats.totalCorrect + correctInLine} tone="green" />
            <StatTile label="Wrong" value={sessionStats.totalWrong + wrongInLine} tone="red" />
          </div>
        }
      />

      <PremiumPanel className="mb-6">
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center md:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-[#fff8e6]">{actionCopy}</p>
              <span className="rounded-md bg-[#f8f1df]/[0.08] px-2.5 py-1 text-xs font-medium text-[#d7c69f]">
                {playedUserMoves}/{userMovesInLine} moves
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f8f1df]/[0.08]">
              <div
                className="h-full rounded-full bg-[#d7b46a] transition-[width] duration-300 ease-out"
                style={{ width: `${lineProgress}%` }}
              />
            </div>
          </div>
          <div className="flex gap-2 text-xs text-[#c9bea4]">
            <span className="rounded-lg bg-[#167753]/[0.18] px-3 py-2 text-[#73d5a0]">
              {correctInLine} correct
            </span>
            <span className="rounded-lg bg-[#96382a]/[0.18] px-3 py-2 text-[#e88a72]">
              {wrongInLine} wrong
            </span>
          </div>
        </div>
      </PremiumPanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,520px)_1fr]">
        <PremiumPanel>
          <div className="p-4 md:p-5">
            <div className="rounded-xl bg-[#f8f1df]/[0.065] p-3">
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
            </div>

            {waitingForUser && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f8f1df]/[0.06] p-1">
                  {(['mouse', 'keyboard'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setInputMode(mode);
                        if (mode === 'keyboard') setTimeout(() => notationRef.current?.focus(), 50);
                      }}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b46a]/70 ${
                        inputMode === mode
                          ? 'bg-[#f8f1df] text-[#11100d]'
                          : 'text-[#c9bea4] hover:bg-[#f8f1df]/[0.08] hover:text-[#fff8e6]'
                      }`}
                    >
                      {mode === 'mouse' ? 'Board' : 'Notation'}
                    </button>
                  ))}
                </div>
                {inputMode === 'keyboard' && (
                  <div className="flex gap-2">
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
                      placeholder="Type move, e.g. Nf3"
                      className={`${fieldClassName} py-2 font-mono`}
                      autoFocus
                    />
                    <SecondaryButton onClick={handleNotationSubmit} className="px-4 py-2 text-xs">
                      Play
                    </SecondaryButton>
                  </div>
                )}
                {notationError && <p className="text-sm text-[#e88a72]">{notationError}</p>}
              </div>
            )}

            {linePhase === 'learn' && (
              <SecondaryButton onClick={skipLearn} className="mt-4 px-4 py-2 text-xs">
                Skip to drill
              </SecondaryButton>
            )}
          </div>
        </PremiumPanel>

        <div className="space-y-4">
          <PremiumPanel>
            <section className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a99d82]">
                Next action
              </p>
              {linePhase === 'learn' && (
                <div className="mt-4 rounded-xl bg-[#d7b46a]/[0.14] p-4 text-sm leading-6 text-[#ead9a5]">
                  Watch the continuation, then drill it from memory.
                  <p className="mt-2 text-xs text-[#c8b68c]">
                    Step {Math.min(stepIndex + 1, line.steps.length)} / {line.steps.length}
                  </p>
                </div>
              )}

              {linePhase === 'drill' && waitingForUser && !feedback && (
                <div className="mt-4 rounded-xl bg-[#f8f1df]/[0.075] p-4 text-sm leading-6 text-[#e5dcc7]">
                  <span className="font-semibold text-[#fff8e6]">Your move.</span> Play move{' '}
                  {playedUserMoves + 1} of {userMovesInLine} for {playerColor}.
                </div>
              )}

              {feedback && (
                <div
                  className={`mt-4 rounded-xl p-4 text-sm font-semibold ${
                    feedback.type === 'correct'
                      ? 'bg-[#167753]/[0.18] text-[#73d5a0]'
                      : 'bg-[#96382a]/[0.18] text-[#e88a72]'
                  }`}
                >
                  {feedback.type === 'correct' ? 'Correct' : 'Wrong'} · {feedback.text}
                </div>
              )}

              {linePhase === 'line-done' && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl bg-[#f8f1df]/[0.075] p-4">
                    <p className="font-semibold text-[#fff8e6]">
                      {correctInLine}/{correctInLine + wrongInLine} correct
                    </p>
                    {wrongInLine === 0 && (
                      <p className="mt-1 text-sm text-[#73d5a0]">Perfect line.</p>
                    )}
                  </div>
                  <PremiumButton onClick={nextLine}>
                    {lineIndex + 1 < lines.length ? 'Next line' : 'Finish session'}
                  </PremiumButton>
                </div>
              )}
            </section>
          </PremiumPanel>

          {(showAnnotation && step?.annotation) && (
            <PremiumPanel>
              <section className="p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f846d]">
                  Annotation
                </p>
                <p className="text-sm leading-6 text-[#d8cfba]">{step.annotation}</p>
              </section>
            </PremiumPanel>
          )}

          {linePhase === 'learn' && stepIndex > 0 && line.steps[stepIndex - 1]?.annotation && (
            <PremiumPanel>
              <section className="p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f846d]">
                  Annotation
                </p>
                <p className="text-sm leading-6 text-[#d8cfba]">
                  {line.steps[stepIndex - 1].annotation}
                </p>
              </section>
            </PremiumPanel>
          )}

          {linePhase === 'drill' && lineResults.length > 0 && (
            <PremiumPanel>
              <section className="p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f846d]">
                  Move trace
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {lineResults.map((r, i) => (
                    <span
                      key={i}
                      className={`rounded-lg px-3 py-1.5 font-semibold ${
                        r.correct
                          ? 'bg-[#167753]/[0.18] text-[#73d5a0]'
                          : 'bg-[#96382a]/[0.18] text-[#e88a72]'
                      }`}
                    >
                      {r.correct ? 'Correct' : 'Wrong'}
                    </span>
                  ))}
                </div>
              </section>
            </PremiumPanel>
          )}
        </div>
      </div>
    </AppSurface>
  );
}
