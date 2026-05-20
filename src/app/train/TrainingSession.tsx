/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getMoveSound } from '@/lib/preferences';
import { playMoveSound } from '@/lib/sound/moveSound';

type MoveResult = { cardId: string; correct: boolean; responseTimeMs: number };
type LinePhase = 'browse' | 'drill' | 'line-done';
type SessionPhase = 'playing' | 'done';
type Props = { initialLines: TrainingLine[]; filterBar?: React.ReactNode };

export function TrainingSession({ initialLines, filterBar }: Props) {
  const [lines] = useState(initialLines);
  const [lineIndex, setLineIndex] = useState(0);
  const [linePhase, setLinePhase] = useState<LinePhase>('browse');
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('playing');

  const [browseIndex, setBrowseIndex] = useState(0);
  const [drillRun, setDrillRun] = useState(1);
  const [drillPassCount, setDrillPassCount] = useState(1);
  const [drill1Stats, setDrill1Stats] = useState<{ correct: number; wrong: number } | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; text: string } | null>(null);
  const [lineResults, setLineResults] = useState<MoveResult[]>([]);
  const [lineCorrect, setLineCorrect] = useState(0);
  const [lineWrong, setLineWrong] = useState(0);
  const [moveStartTime, setMoveStartTime] = useState(0);
  const [inErrorRecovery, setInErrorRecovery] = useState(false);
  const [errorQueue, setErrorQueue] = useState<number[]>([]);
  const [errorCorrectStreak, setErrorCorrectStreak] = useState(0);
  const [lineSaving, setLineSaving] = useState(false);
  const [lineSaved, setLineSaved] = useState(false);

  const [boardFen, setBoardFen] = useState('');
  const [lastMoveUci, setLastMoveUci] = useState<[string, string] | undefined>();

  const [inputMode, setInputMode] = useState<'mouse' | 'keyboard'>('mouse');
  const [notationInput, setNotationInput] = useState('');
  const [notationError, setNotationError] = useState<string | null>(null);
  const [needsManualNext, setNeedsManualNext] = useState(false);
  const [tracePreviewIndex, setTracePreviewIndex] = useState<number | null>(null);
  const [queuedPremove, setQueuedPremove] = useState<{ from: string; to: string } | null>(null);
  const notationRef = useRef<HTMLInputElement>(null);
  const submitRatings = useMutation(api.training.submitLineRatings);
  const markInfoLineViewed = useMutation(api.training.markInfoLineViewed);

  const [sessionStats, setSessionStats] = useState({
    linesCompleted: 0,
    totalCorrect: 0,
    totalWrong: 0,
    startTime: Date.now(),
  });

  const line = lines[lineIndex] ?? null;
  const userStepIndexes = useMemo(
    () => (line ? line.steps.map((s, i) => (s.isUserMove ? i : -1)).filter((i) => i >= 0) : []),
    [line],
  );
  const currentStepIndex = inErrorRecovery
    ? (errorQueue[0] ?? -1)
    : (userStepIndexes[questionIndex] ?? -1);
  const step: LineStep | null = line && currentStepIndex >= 0 ? line.steps[currentStepIndex] ?? null : null;
  const playerColor = line?.courseColor ?? 'white';

  useEffect(() => {
    if (!line) return;
    const firstFen = line.steps[0]?.parentFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
    setBoardFen(firstFen + ' 0 1');
    setBrowseIndex(0);
    setDrillRun(1);
    setDrillPassCount(line.isNew ? 2 : 1);
    setDrill1Stats(null);
    setQuestionIndex(0);
    setWaitingForUser(false);
    setShowAnnotation(false);
    setFeedback(null);
    setLineResults([]);
    setLineCorrect(0);
    setLineWrong(0);
    setMoveStartTime(0);
    setInErrorRecovery(false);
    setErrorQueue([]);
    setErrorCorrectStreak(0);
    setLineSaving(false);
    setLineSaved(false);
    setLastMoveUci(undefined);
    setNotationInput('');
    setNotationError(null);
    setNeedsManualNext(false);
    setTracePreviewIndex(null);
    setQueuedPremove(null);
    setLinePhase(line.isInfoOnly || line.isNew ? 'browse' : 'drill');
  }, [line, lineIndex]);

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

  useEffect(() => {
    if (linePhase !== 'drill' || !step || feedback) return;
    setBoardFen(step.parentFen + ' 0 1');
    setLastMoveUci(undefined);
    setWaitingForUser(true);
    setMoveStartTime(Date.now());
    if (inputMode === 'keyboard') {
      setTimeout(() => notationRef.current?.focus(), 50);
    }
  }, [linePhase, step, feedback, inputMode]);

  useEffect(() => {
    if (linePhase !== 'drill' || feedback) return;
    if (!inErrorRecovery && questionIndex >= userStepIndexes.length) {
      if (drillRun < drillPassCount) {
        setDrill1Stats({ correct: lineCorrect, wrong: lineWrong });
        const t = setTimeout(() => {
          setDrillRun((r) => r + 1);
          setQuestionIndex(0);
          setLineCorrect(0);
          setLineWrong(0);
          setFeedback(null);
          setShowAnnotation(false);
          setNeedsManualNext(false);
          setWaitingForUser(false);
          setTracePreviewIndex(null);
          setErrorQueue([]);
          setErrorCorrectStreak(0);
        }, 900);
        return () => clearTimeout(t);
      }
      if (errorQueue.length > 0) {
        setInErrorRecovery(true);
        return;
      }
      setLinePhase('line-done');
      return;
    }
    if (inErrorRecovery && errorQueue.length === 0) {
      setLinePhase('line-done');
    }
  }, [linePhase, feedback, inErrorRecovery, questionIndex, userStepIndexes.length, drillRun, drillPassCount, lineCorrect, lineWrong, errorQueue.length]);

  useEffect(() => {
    if (linePhase !== 'line-done' || lineSaving || lineSaved) return;
    setLineSaving(true);
    void (async () => {
      if (line?.isInfoOnly) {
        await markInfoLineViewed({
          chapterId: line.chapterId as Id<'chapters'>,
          lineKey: line.lineKey,
        }).catch(() => undefined);
      }
      if (lineResults.length > 0) {
        await submitRatings({
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
      setLineSaved(true);
      setLineSaving(false);
    })();
  }, [linePhase, lineSaving, lineSaved, lineResults, submitRatings, lineCorrect, lineWrong, line, markInfoLineViewed]);

  const tryMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!line || !step || linePhase !== 'drill' || !waitingForUser) return;
      try {
        const chess = new Chess(step.parentFen + ' 0 1');
        const result = chess.move({ from, to, promotion: promotion ?? 'q' });
        if (!result) return;
        playMoveSound(getMoveSound());

        const playedUci = from + to + (result.promotion ?? '');
        const correct = playedUci === step.uci || result.san === step.san;
        const responseTimeMs = Date.now() - moveStartTime;

        if (step.cardId) {
          setLineResults((prev) => [...prev, { cardId: step.cardId!, correct, responseTimeMs }]);
        }
        if (correct) setLineCorrect((c) => c + 1);
        else setLineWrong((c) => c + 1);

        setBoardFen(step.childFen + ' 0 1');
        setLastMoveUci([step.uci.slice(0, 2), step.uci.slice(2, 4)]);
        setWaitingForUser(false);
        setNotationInput('');
        setNotationError(null);
        setTracePreviewIndex(null);

        if (correct) {
          setFeedback({ type: 'correct', text: step.san });
          setShowAnnotation(!!step.annotation);
          setNeedsManualNext(false);
          if (inErrorRecovery) {
            const nextStreak = errorCorrectStreak + 1;
            setErrorCorrectStreak(nextStreak);
            if (nextStreak >= 2) {
              setErrorQueue((q) => q.filter((idx) => idx !== currentStepIndex));
              setErrorCorrectStreak(0);
            }
          }
          const delay = step.annotation ? 1500 : 650;
          setTimeout(() => {
            setFeedback(null);
            setShowAnnotation(false);
            if (!inErrorRecovery) setQuestionIndex((i) => i + 1);
          }, delay);
          return;
        }

        setFeedback({
          type: 'wrong',
          text: `You played ${result.san}. Correct: ${step.san}`,
        });
        setShowAnnotation(!!step.annotation);
        setNeedsManualNext(true);
        if (!inErrorRecovery) {
          setErrorQueue((prev) => (prev.includes(currentStepIndex) ? prev : [...prev, currentStepIndex]));
        } else {
          setErrorCorrectStreak(0);
        }
      } catch {
        // invalid move
      }
    },
    [line, step, linePhase, waitingForUser, moveStartTime, inErrorRecovery, currentStepIndex, errorCorrectStreak],
  );

  const onBoardMove = useCallback((orig: string, dest: string) => tryMove(orig, dest), [tryMove]);

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

  const startDrilling = useCallback(() => {
    if (!line) return;
    if (line.isInfoOnly || userStepIndexes.length === 0) {
      setLinePhase('line-done');
      return;
    }
    setLinePhase('drill');
    setDrillRun(1);
    setQuestionIndex(0);
    setInErrorRecovery(false);
    setErrorQueue([]);
    setErrorCorrectStreak(0);
    setFeedback(null);
    setShowAnnotation(false);
    setWaitingForUser(false);
    setLineCorrect(0);
    setLineWrong(0);
    setLineResults([]);
    const firstUserStep = line.steps[userStepIndexes[0]];
    setBoardFen((firstUserStep?.parentFen ?? line.steps[0]?.parentFen ?? '') + ' 0 1');
    setLastMoveUci(undefined);
  }, [line, userStepIndexes]);

  const continueAfterWrong = useCallback(() => {
    if (!needsManualNext) return;
    setNeedsManualNext(false);
    setFeedback(null);
    setShowAnnotation(false);
    setTracePreviewIndex(null);
    if (!inErrorRecovery) {
      setQuestionIndex((i) => i + 1);
    }
  }, [needsManualNext, inErrorRecovery]);

  const nextLine = useCallback(() => {
    if (!lineSaved) return;
    const next = lineIndex + 1;
    if (next >= lines.length) setSessionPhase('done');
    else setLineIndex(next);
  }, [lineSaved, lineIndex, lines.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (linePhase === 'browse' && line) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setBrowseIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          const next = browseIndex + 1;
          if (next <= line.steps.length) setBrowseIndex(next);
          else startDrilling();
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
      if (e.key === ' ' && linePhase === 'line-done' && lineSaved && !lineSaving) {
        e.preventDefault();
        nextLine();
        return;
      }
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
  }, [linePhase, browseIndex, line, waitingForUser, needsManualNext, feedback, startDrilling, continueAfterWrong, lineSaved, lineSaving, nextLine]);

  useEffect(() => {
    if (!queuedPremove || !waitingForUser || linePhase !== 'drill' || needsManualNext) return;
    const { from, to } = queuedPremove;
    setQueuedPremove(null);
    const timer = window.setTimeout(() => {
      tryMove(from, to);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [queuedPremove, waitingForUser, linePhase, needsManualNext, tryMove]);

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
          title={<>Session <span className="font-display-italic">closed</span>.</>}
          body="Your recall data has been written back into the schedule. The next review will appear when memory is due."
        />
        <div className="grid grid-cols-2 gap-x-2 gap-y-8 border-y border-[color:var(--paper-edge)] py-8 md:grid-cols-5">
          <StatTile label="Lines drilled" value={sessionStats.linesCompleted} />
          <StatTile label="Moves correct" value={sessionStats.totalCorrect} tone="green" />
          <StatTile label="Moves wrong" value={sessionStats.totalWrong} tone="red" />
          <StatTile label="Accuracy" value={total > 0 ? `${accuracy}%` : '—'} tone={accuracy >= 80 ? 'green' : accuracy >= 50 ? 'gold' : 'red'} />
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

  const userMovesInLine = userStepIndexes.length;
  const playedUserMoves = lineCorrect + lineWrong;
  const betweenDrills = linePhase === 'drill' && !inErrorRecovery && drillRun === 1 && questionIndex >= userMovesInLine && !feedback;
  const recoveryResolved = userMovesInLine - errorQueue.length;
  const drillProgressBase = inErrorRecovery ? recoveryResolved : questionIndex;
  const lineProgress = linePhase === 'browse'
    ? Math.round((browseIndex / Math.max(line.steps.length, 1)) * 100)
    : linePhase === 'line-done'
      ? 100
      : Math.round((drillProgressBase / Math.max(userMovesInLine, 1)) * 100);
  const phaseLabel = linePhase === 'browse'
    ? `Study · ${browseIndex}/${line.steps.length}`
    : linePhase === 'line-done'
      ? 'Line complete'
      : betweenDrills
        ? 'Starting next pass…'
        : inErrorRecovery
          ? 'Error recovery'
          : waitingForUser
            ? `Your move · ${playerColor}`
            : `Drill ${drillRun}/${drillPassCount}`;
  const browseAnnotation = linePhase === 'browse' && browseIndex > 0 ? line.steps[browseIndex - 1]?.annotation ?? null : null;
  const traceUpTo = linePhase === 'line-done'
    ? line.steps.length
    : Math.min((userStepIndexes[questionIndex] ?? line.steps.length) + (waitingForUser ? 0 : 1), line.steps.length);
  const drillTraceTokens = line.steps.slice(0, traceUpTo).map((s, i) => {
    const sideToMove = s.parentFen.split(/\s+/)[1] === 'w' ? 'white' : 'black';
    const prefix = sideToMove === 'white' ? `${s.moveNumber}.` : '';
    return { key: `${i}-${s.uci}`, text: `${prefix}${s.san}`, childFen: s.childFen, uci: s.uci, index: i };
  });
  const browseTraceTokens = line.steps.map((s, i) => {
    const sideToMove = s.parentFen.split(/\s+/)[1] === 'w' ? 'white' : 'black';
    const prefix = sideToMove === 'white' ? `${s.moveNumber}.` : '';
    return { key: `browse-${i}-${s.uci}`, text: `${prefix}${s.san}`, childFen: s.childFen, uci: s.uci, index: i, hasAnnotation: Boolean(s.annotation?.trim()) };
  });

  return (
    <AppSurface>
      {filterBar}
      <div className="mb-6 grid items-baseline gap-3 border-b border-[color:var(--paper-edge)] pb-3 md:grid-cols-[auto_1fr_auto] md:gap-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Training · Line <span className="font-display italic text-[color:var(--ink)]">{lineIndex + 1}</span> of {lines.length}
        </p>
        <p className="truncate font-display-italic text-[15px] text-[color:var(--ink-soft)]">
          {line.courseName} <span className="text-[color:var(--ink-ghost)]">·</span> {line.chapterName}
        </p>
        <div className="flex items-center gap-3">
          <Stamp tone={linePhase === 'browse' ? 'gold' : linePhase === 'line-done' ? 'green' : betweenDrills ? 'gold' : 'red'}>
            {linePhase === 'browse' ? 'Study' : linePhase === 'line-done' ? 'Done' : betweenDrills ? 'Pass done' : inErrorRecovery ? 'Recovery' : `Drill ${drillRun}/${drillPassCount}`}
          </Stamp>
          {linePhase === 'drill' && !betweenDrills && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] tabular-nums">{playedUserMoves}/{userMovesInLine}</span>
          )}
          {linePhase === 'line-done' && (
            <PremiumButton onClick={nextLine} disabled={!lineSaved || lineSaving}>
              {lineSaving ? 'Saving…' : lineIndex + 1 < lines.length ? 'Next line' : 'Finish session'}
            </PremiumButton>
          )}
        </div>
      </div>

      <div className="mb-10 h-px bg-[color:var(--paper-rule)]">
        <div className="h-full bg-[color:var(--margin-red)] transition-[width] duration-500 ease-out" style={{ width: `${lineProgress}%` }} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[auto_minmax(420px,1fr)] lg:gap-14">
        <div>
          <div className="mb-3 flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Diagram</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">{phaseLabel}</p>
          </div>

          <div className="-mx-5 md:mx-0">
            <ResizableDiagramFrame caption={linePhase === 'browse' ? `Move ${browseIndex} / ${line.steps.length}` : `Move ${Math.min(questionIndex + 1, userMovesInLine)} / ${userMovesInLine}`}>
              <ChessBoard
                fen={boardFen}
                orientation={playerColor}
                viewOnly={linePhase === 'browse' || betweenDrills}
                lastMove={lastMoveUci}
                movable={linePhase === 'drill' && !betweenDrills && inputMode === 'mouse'
                  ? waitingForUser
                    ? { free: false, dests: legalDests, color: playerColor, showDests: true }
                    : { free: false, color: playerColor, showDests: true }
                  : undefined}
                premovable={{ enabled: linePhase === 'drill' && !betweenDrills }}
                onMove={onBoardMove}
                onPremoveSet={(orig, dest) => { setQueuedPremove({ from: orig, to: dest }); }}
                arrows={feedback?.type === 'wrong' && step ? [{ orig: step.uci.slice(0, 2), dest: step.uci.slice(2, 4), brush: 'green' }] : undefined}
              />
            </ResizableDiagramFrame>
          </div>

          {linePhase === 'browse' && (
            <div className="mt-6">
              <div className="grid grid-cols-3 divide-x divide-[color:var(--paper-edge)] border border-[color:var(--paper-edge)]">
                <button type="button" onClick={() => setBrowseIndex((i) => Math.max(0, i - 1))} disabled={browseIndex === 0} className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 hover:bg-[color:var(--paper-deep)] disabled:opacity-30">← Back</button>
                <button type="button" onClick={() => { const next = browseIndex + 1; if (next <= line.steps.length) setBrowseIndex(next); else startDrilling(); }} className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 hover:bg-[color:var(--paper-deep)]">{browseIndex >= line.steps.length ? 'Drill →' : 'Forward →'}</button>
                <button type="button" onClick={startDrilling} className="bg-[color:var(--ink)] px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] transition-colors duration-200 hover:opacity-90">Start drill</button>
              </div>
            </div>
          )}

          {linePhase === 'browse' && browseAnnotation && (
            <section className="mt-4 lg:hidden">
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Annotation</p>
              <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">{browseAnnotation}</p>
            </section>
          )}

          {linePhase === 'drill' && !betweenDrills && waitingForUser && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 divide-x divide-[color:var(--paper-edge)] border border-[color:var(--paper-edge)]">
                {(['mouse', 'keyboard'] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => { setInputMode(mode); if (mode === 'keyboard') setTimeout(() => notationRef.current?.focus(), 50); }} className={`px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 ${inputMode === mode ? 'bg-[color:var(--ink)] text-[color:var(--paper)]' : 'text-[color:var(--ink)] hover:bg-[color:var(--paper-deep)]'}`}>
                    {mode === 'mouse' ? 'Board' : 'Notation'}
                  </button>
                ))}
              </div>
              {inputMode === 'keyboard' && (
                <div className="flex items-baseline gap-3 border-b border-[color:var(--paper-edge)] pb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">→</span>
                  <input ref={notationRef} type="text" value={notationInput} onChange={(e) => { setNotationInput(e.target.value); setNotationError(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNotationSubmit(); } }} placeholder="e.g. Nf3" className="notation flex-1 bg-transparent text-lg text-[color:var(--ink)] placeholder:text-[color:var(--ink-ghost)] focus:outline-none" autoFocus />
                  <SecondaryButton onClick={handleNotationSubmit}>Play</SecondaryButton>
                </div>
              )}
              {notationError && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-display-italic text-sm text-[color:var(--margin-red)]">{notationError}</p>
                  <Link href="/documentation/notation" target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[5px] transition-colors duration-200 hover:text-[color:var(--library-green)] hover:decoration-[color:var(--library-green)]">What notation is accepted?</Link>
                </div>
              )}
            </div>
          )}

          {needsManualNext && feedback?.type === 'wrong' && (
            <div className="mt-4">
              <PremiumButton onClick={continueAfterWrong}>Continue</PremiumButton>
            </div>
          )}
        </div>

        <div className="space-y-10">
          <section>
            <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Prompt</p>
            <p className="mt-5 font-display text-3xl font-medium leading-[1.15] tracking-[-0.01em] text-[color:var(--ink)] md:text-4xl">
              {linePhase === 'browse'
                ? browseIndex === 0
                  ? <>Study this <span className="font-display-italic">line</span>.</>
                  : browseIndex >= line.steps.length
                    ? <>End of line — ready to <span className="font-display-italic">drill?</span></>
                    : <>Move {browseIndex} of {line.steps.length}.</>
                : linePhase === 'line-done'
                  ? lineWrong === 0
                    ? <>A <span className="font-display-italic">perfect</span> line.</>
                    : <>{lineCorrect}/{lineCorrect + lineWrong} <span className="font-display-italic">correct</span>.</>
                  : betweenDrills
                    ? <>Pass complete — <span className="font-display-italic">resetting…</span></>
                    : waitingForUser
                      ? <>{inErrorRecovery ? 'Retry a missed move.' : `Your turn — move ${Math.min(questionIndex + 1, userMovesInLine)} of ${userMovesInLine}.`}</>
                      : <>Waiting…</>}
            </p>
            <p className="mt-3 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
              {linePhase === 'browse'
                ? 'Navigate with ← → · read the annotations · press Enter or Start drill when ready.'
                : linePhase === 'line-done'
                  ? 'Review the result, then continue.'
                  : betweenDrills
                    ? `Pass 1: ${drill1Stats?.correct ?? 0}/${(drill1Stats?.correct ?? 0) + (drill1Stats?.wrong ?? 0)} correct.`
                    : waitingForUser
                      ? inputMode === 'keyboard'
                        ? 'Type the prepared move in algebraic notation.'
                        : 'Find the prepared move on the board.'
                      : 'The position is loading.'}
            </p>
          </section>

          {feedback && (
            <section className={`border-l-2 pl-4 ${feedback.type === 'correct' ? 'border-[color:var(--library-green)]' : 'border-[color:var(--margin-red)]'}`}>
              <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${feedback.type === 'correct' ? 'text-[color:var(--library-green)]' : 'text-[color:var(--margin-red)]'}`}>
                {feedback.type === 'correct' ? '✓ Correct' : '✗ Departure from prep'}
              </p>
              <p className="notation mt-2 text-[15px] text-[color:var(--ink)]">{feedback.text}</p>
            </section>
          )}

          {((linePhase === 'browse' && browseAnnotation) || (linePhase === 'drill' && showAnnotation && step?.annotation)) && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Annotation</p>
              <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">{linePhase === 'browse' ? browseAnnotation : step?.annotation}</p>
            </section>
          )}

          {linePhase === 'browse' && browseTraceTokens.length > 0 && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Line</p>
              <ol className="mt-4 flex flex-wrap gap-2">
                {browseTraceTokens.map((token) => (
                  <li key={token.key} className={`notation cursor-pointer rounded-lg px-2.5 py-1 text-[16px] leading-none transition-colors duration-150 md:text-[17px] ${browseIndex === token.index + 1 ? 'bg-[color:var(--ink)] text-[color:var(--paper)]' : line.steps[token.index]?.isUserMove ? 'bg-[color:var(--paper-deep)] text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]' : token.hasAnnotation ? 'bg-[color:var(--library-green)]/15 text-[color:var(--library-green)] hover:bg-[color:var(--library-green)]/25' : 'bg-transparent text-[color:var(--ink-soft)] hover:bg-[color:var(--paper-edge)]'}`} onClick={() => setBrowseIndex(token.index + 1)}>
                    {token.text}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {linePhase === 'drill' && drillTraceTokens.length > 0 && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Trace</p>
              <ol className="mt-4 flex flex-wrap gap-2">
                {drillTraceTokens.map((token) => (
                  <li key={token.key} className={`notation rounded-lg px-2.5 py-1 text-[16px] leading-none transition-colors duration-150 md:text-[17px] ${tracePreviewIndex === token.index ? 'bg-[color:var(--ink-faint)] text-[color:var(--paper)]' : 'bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]'} ${needsManualNext && feedback?.type === 'wrong' ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => {
                    if (!(needsManualNext && feedback?.type === 'wrong')) return;
                    setTracePreviewIndex(token.index);
                    setBoardFen(token.childFen + ' 0 1');
                    setLastMoveUci([token.uci.slice(0, 2), token.uci.slice(2, 4)]);
                  }}>
                    {token.text}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {linePhase === 'line-done' && (
            <section>
              <div className="grid grid-cols-2 gap-x-2 gap-y-6 border-y border-[color:var(--paper-edge)] py-6 md:grid-cols-4">
                {drill1Stats && (
                  <>
                    <StatTile label="Pass 1 correct" value={drill1Stats.correct} tone="green" />
                    <StatTile label="Pass 1 wrong" value={drill1Stats.wrong} tone={drill1Stats.wrong === 0 ? 'green' : 'red'} />
                  </>
                )}
                <StatTile label={drillPassCount === 1 ? 'Quiz correct' : 'Pass 2 correct'} value={lineCorrect} tone="green" />
                <StatTile label={drillPassCount === 1 ? 'Quiz wrong' : 'Pass 2 wrong'} value={lineWrong} tone={lineWrong === 0 ? 'green' : 'red'} />
              </div>
            </section>
          )}
        </div>
      </div>
    </AppSurface>
  );
}
