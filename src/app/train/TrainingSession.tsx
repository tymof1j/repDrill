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
      <div className="mx-auto aspect-square w-full max-w-none animate-pulse rounded bg-[color:var(--paper-rule)]" />
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
import { parseStudyMarkup, toCompleteFen } from './annotation';
import { useMutation } from '@/lib/supabase/client';
import { api } from '@/lib/supabase/api';
import type { Id } from '@/lib/supabase/types';
import { normalizeNotation } from '@/lib/chess/notation';
import {
  readLearnQuizPasses,
  recordLearnResume,
  type LearnQuizPasses,
} from '@/lib/bookTrainingPreferences';

type MoveResult = { cardId: string; correct: boolean; responseTimeMs: number };
type LinePhase = 'browse' | 'drill' | 'line-done';
type SessionPhase = 'playing' | 'done';
type Props = {
  initialLines: TrainingLine[];
  filterBar?: React.ReactNode;
  /** Guided Learn mode starts every line in the one-move-at-a-time overview. */
  studyMode?: boolean;
  /** Last line id saved by Learn mode, used to resume the course. */
  initialLineId?: string | null;
};

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function escapePgnTag(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', ' ');
}

function buildLinePgn(line: TrainingLine) {
  if (line.steps.length === 0) return null;
  try {
    const startingFen = toCompleteFen(line.steps[0].parentFen);
    const chess = new Chess(startingFen);
    const movetext: string[] = [];
    for (const step of line.steps) {
      const sideToMove = chess.turn();
      const result = chess.move({
        from: step.uci.slice(0, 2),
        to: step.uci.slice(2, 4),
        promotion: step.uci.slice(4) || undefined,
      });
      if (sideToMove === 'w') movetext.push(`${step.moveNumber}.`);
      else if (movetext.length === 0) movetext.push(`${step.moveNumber}...`);
      movetext.push(result.san);
    }
    const tags = [
      `[Event "${escapePgnTag(line.courseName)}"]`,
      `[Chapter "${escapePgnTag(line.chapterName)}"]`,
      ...(startingFen !== STANDARD_FEN
        ? [`[SetUp "1"]`, `[FEN "${escapePgnTag(startingFen)}"]`]
        : []),
    ];
    return `${tags.join('\n')}\n\n${movetext.join(' ')} *`;
  } catch {
    return null;
  }
}

export function TrainingSession({ initialLines, filterBar, studyMode = false, initialLineId = null }: Props) {
  const [lines] = useState(initialLines);
  const [lineIndex, setLineIndex] = useState(0);
  const [linePhase, setLinePhase] = useState<LinePhase>('browse');
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('playing');

  const [browseIndex, setBrowseIndex] = useState(0);
  const [drillRun, setDrillRun] = useState(1);
  const [drillPassCount, setDrillPassCount] = useState(1);
  const [configuredQuizPasses, setConfiguredQuizPasses] = useState<LearnQuizPasses>(() => readLearnQuizPasses());
  const [drill1Stats, setDrill1Stats] = useState<{ correct: number; wrong: number } | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; text: string } | null>(null);
  const [lineResults, setLineResults] = useState<MoveResult[]>([]);
  const [lineCorrect, setLineCorrect] = useState(0);
  const [lineWrong, setLineWrong] = useState(0);
  // Timing is telemetry only; keeping it in a ref avoids a render for every
  // prompt transition while preserving the exact response-time measurement.
  const moveStartTimeRef = useRef(0);
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
  // The post-answer solution navigator must not move the active drill cursor.
  const [solutionPreviewIndex, setSolutionPreviewIndex] = useState<number | null>(null);
  const [queuedPremove, setQueuedPremove] = useState<{ from: string; to: string } | null>(null);
  const notationRef = useRef<HTMLInputElement>(null);
  const viewportRestoreFrameRef = useRef<number | null>(null);
  const submitRatings = useMutation(api.training.submitLineRatings);
  const markInfoLineViewed = useMutation(api.training.markInfoLineViewed);

  const [sessionStats, setSessionStats] = useState({
    linesCompleted: 0,
    totalCorrect: 0,
    totalWrong: 0,
    startTime: Date.now(),
  });

  const line = lines[lineIndex] ?? null;

  useEffect(() => {
    if (!studyMode || !initialLineId) return;
    const index = lines.findIndex((candidate) => candidate.lineId === initialLineId);
    if (index >= 0) setLineIndex(index);
  }, [initialLineId, lines, studyMode]);

  useEffect(() => {
    const onPasses = () => setConfiguredQuizPasses(readLearnQuizPasses());
    window.addEventListener('repdrill:learn-quiz-passes', onPasses);
    return () => window.removeEventListener('repdrill:learn-quiz-passes', onPasses);
  }, []);

  useEffect(() => {
    if (!studyMode || !line) return;
    recordLearnResume(line.courseId, line.lineId);
  }, [line, studyMode]);

  // A move changes prompt, feedback, trace and sometimes an annotation. Some
  // browsers can still adjust the viewport after that reflow even with scroll
  // anchoring disabled. Lock only the two paints following a user answer.
  const preserveViewportAfterMove = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Authenticated pages scroll inside #main-content, not the window. Using
    // window.scrollY here made the earlier guard a no-op in the app shell.
    const scrollContainer = document.getElementById('main-content');
    const top = scrollContainer?.scrollTop ?? window.scrollY;
    const restore = () => {
      const currentTop = scrollContainer?.scrollTop ?? window.scrollY;
      if (Math.abs(currentTop - top) < 1) return;
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      if (scrollContainer) scrollContainer.scrollTop = top;
      else window.scrollTo(0, top);
      root.style.scrollBehavior = previousBehavior;
    };
    window.requestAnimationFrame(() => {
      restore();
      if (viewportRestoreFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportRestoreFrameRef.current);
      }
      viewportRestoreFrameRef.current = window.requestAnimationFrame(restore);
    });
  }, []);

  useEffect(() => () => {
    if (viewportRestoreFrameRef.current !== null) {
      window.cancelAnimationFrame(viewportRestoreFrameRef.current);
    }
  }, []);
  const userStepIndexes = useMemo(
    () => (line ? line.steps.map((s, i) => (s.isUserMove ? i : -1)).filter((i) => i >= 0) : []),
    [line],
  );
  // Study navigation may reveal the position immediately before the first
  // prepared/user move, but never the continuation that is being tested.
  const browseLimit = studyMode
    ? (line?.steps.length ?? 0)
    : (userStepIndexes[0] ?? line?.steps.length ?? 0);
  const currentStepIndex = inErrorRecovery
    ? (errorQueue[0] ?? -1)
    : (userStepIndexes[questionIndex] ?? -1);
  const step: LineStep | null = line && currentStepIndex >= 0 ? line.steps[currentStepIndex] ?? null : null;
  const playerColor = line?.courseColor ?? 'white';

  // Parse study drawings once per position.  The markup is intentionally
  // derived before any phase-specific early return so hook ordering remains
  // stable while Convex transitions from loading to a populated queue.
  const browseMarkup = useMemo(
    () => {
      const browseStep = linePhase === 'browse' && browseIndex > 0 ? line?.steps[browseIndex - 1] : undefined;
      return parseStudyMarkup(browseStep?.annotation, browseStep?.annotations);
    },
    [line, linePhase, browseIndex],
  );
  const drillMarkup = useMemo(
    () => parseStudyMarkup(step?.annotation, step?.annotations),
    [step?.annotation, step?.annotations],
  );

  useEffect(() => {
    if (!line) return;
    const firstFen = line.steps[0]?.parentFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
    setBoardFen(toCompleteFen(firstFen));
    setBrowseIndex(0);
    setDrillRun(1);
    setDrillPassCount(studyMode ? configuredQuizPasses : line.isNew ? 2 : 1);
    setDrill1Stats(null);
    setQuestionIndex(0);
    setWaitingForUser(false);
    setShowAnnotation(false);
    setFeedback(null);
    setLineResults([]);
    setLineCorrect(0);
    setLineWrong(0);
    moveStartTimeRef.current = 0;
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
    setSolutionPreviewIndex(null);
    setQueuedPremove(null);
    setLinePhase(studyMode || line.isInfoOnly || line.isNew ? 'browse' : 'drill');
  }, [configuredQuizPasses, line, lineIndex, studyMode]);

  useEffect(() => {
    if (linePhase !== 'browse' || !line || line.steps.length === 0) return;
    if (browseIndex === 0) {
      setBoardFen(toCompleteFen(line.steps[0].parentFen));
      setLastMoveUci(undefined);
    } else {
      const s = line.steps[browseIndex - 1];
      setBoardFen(toCompleteFen(s.childFen));
      setLastMoveUci([s.uci.slice(0, 2), s.uci.slice(2, 4)]);
    }
  }, [linePhase, browseIndex, line]);

  useEffect(() => {
    if (linePhase !== 'drill' || !step || feedback) return;
    setBoardFen(toCompleteFen(step.parentFen));
    setLastMoveUci(undefined);
    setWaitingForUser(true);
    moveStartTimeRef.current = Date.now();
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
      const finalStep = line?.steps[line.steps.length - 1];
      if (finalStep) {
        setBoardFen(toCompleteFen(finalStep.childFen));
        setLastMoveUci([finalStep.uci.slice(0, 2), finalStep.uci.slice(2, 4)]);
      }
      setSolutionPreviewIndex(line?.steps.length ?? 0);
      setLinePhase('line-done');
      return;
    }
    if (inErrorRecovery && errorQueue.length === 0) {
      const finalStep = line?.steps[line.steps.length - 1];
      if (finalStep) {
        setBoardFen(toCompleteFen(finalStep.childFen));
        setLastMoveUci([finalStep.uci.slice(0, 2), finalStep.uci.slice(2, 4)]);
      }
      setSolutionPreviewIndex(line?.steps.length ?? 0);
      setLinePhase('line-done');
    }
  }, [linePhase, feedback, inErrorRecovery, questionIndex, userStepIndexes.length, drillRun, drillPassCount, lineCorrect, lineWrong, errorQueue.length, line]);

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
        const chess = new Chess(toCompleteFen(step.parentFen));
        const result = chess.move({ from, to, promotion: promotion ?? 'q' });
        if (!result) return;
        const playedUci = from + to + (result.promotion ?? '');
        const correct = playedUci === step.uci || result.san === step.san;
        const responseTimeMs = Math.max(0, Date.now() - moveStartTimeRef.current);

        if (step.cardId) {
          setLineResults((prev) => [...prev, { cardId: step.cardId!, correct, responseTimeMs }]);
        }
        if (correct) setLineCorrect((c) => c + 1);
        else setLineWrong((c) => c + 1);

        setBoardFen(toCompleteFen(step.childFen));
        setLastMoveUci([step.uci.slice(0, 2), step.uci.slice(2, 4)]);
        setWaitingForUser(false);
        setNotationInput('');
        setNotationError(null);
        setTracePreviewIndex(null);
        setSolutionPreviewIndex(currentStepIndex + 1);

        if (correct) {
          // Correct moves should stay out of the way. Continue directly to
          // the next prepared move; annotations are reserved for mistakes.
          setFeedback(null);
          setShowAnnotation(false);
          setNeedsManualNext(false);
          if (inErrorRecovery) {
            const nextStreak = errorCorrectStreak + 1;
            setErrorCorrectStreak(nextStreak);
            if (nextStreak >= 2) {
              setErrorQueue((q) => q.filter((idx) => idx !== currentStepIndex));
              setErrorCorrectStreak(0);
            }
          } else {
            setQuestionIndex((index) => index + 1);
          }
          return;
        }

        setFeedback({
          type: 'wrong',
          text: `You played ${result.san}. Correct: ${step.san}`,
        });
        setShowAnnotation(Boolean(
          step.annotation?.trim() || step.annotations?.arrows?.length || step.annotations?.circles?.length,
        ));
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
    [line, step, linePhase, waitingForUser, inErrorRecovery, currentStepIndex, errorCorrectStreak],
  );

  const onBoardMove = useCallback((orig: string, dest: string) => {
    preserveViewportAfterMove();
    tryMove(orig, dest);
  }, [tryMove, preserveViewportAfterMove]);

  const handleNotationSubmit = useCallback(() => {
    if (!step || !waitingForUser) return;
    const input = notationInput.trim();
    if (!input) return;
    try {
      const fen = toCompleteFen(step.parentFen);
      const normalized = normalizeNotation(input, fen);
      const chess = new Chess(fen);
      const result = chess.move(normalized, { strict: false });
      if (!result) {
        setNotationError('Invalid move.');
        return;
      }
      preserveViewportAfterMove();
      tryMove(result.from, result.to, result.promotion ?? undefined);
    } catch {
      setNotationError('Invalid move.');
    }
  }, [step, waitingForUser, notationInput, tryMove, preserveViewportAfterMove]);

  const onAnalysisMove = useCallback((orig: string, dest: string) => {
    try {
      const chess = new Chess(toCompleteFen(boardFen));
      const result = chess.move({ from: orig, to: dest, promotion: 'q' });
      if (!result) return;
      setBoardFen(toCompleteFen(chess.fen()));
      setLastMoveUci([result.from, result.to]);
      setSolutionPreviewIndex(null);
    } catch {
      // Ignore an invalid free-analysis move.
    }
  }, [boardFen]);

  const legalDests = useMemo(() => {
    if (!step || !waitingForUser || linePhase !== 'drill') return undefined;
    try {
      const chess = new Chess(toCompleteFen(step.parentFen));
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

  const boardInteractive = linePhase === 'drill' && Boolean(step) && waitingForUser && inputMode === 'mouse';
  const analysisInteractive = (linePhase === 'browse' || linePhase === 'line-done' || Boolean(feedback)) && inputMode === 'mouse';
  const boardMovable = useMemo(() => {
    if (boardInteractive) return { free: false, dests: legalDests, color: playerColor, showDests: true };
    if (analysisInteractive) return { free: true, color: 'both' as const, showDests: true };
    return undefined;
  }, [analysisInteractive, boardInteractive, legalDests, playerColor]);
  const boardPremovable = useMemo(
    () => ({ enabled: boardInteractive }),
    [boardInteractive],
  );
  const boardArrows = useMemo(() => {
    if (linePhase === 'browse') return browseMarkup.arrows;
    if (!feedback || !step) return [];
    const reveal = [...drillMarkup.arrows];
    if (feedback.type === 'wrong') {
      const expected = {
        orig: step.uci.slice(0, 2),
        dest: step.uci.slice(2, 4),
        brush: 'green',
      };
      if (!reveal.some((arrow) => arrow.orig === expected.orig && arrow.dest === expected.dest)) {
        reveal.push(expected);
      }
    }
    return reveal;
  }, [browseMarkup.arrows, drillMarkup.arrows, feedback, linePhase, step]);
  const boardSquareMarks = useMemo(
    () => linePhase === 'browse' ? browseMarkup.squareMarks : feedback ? drillMarkup.squareMarks : [],
    [browseMarkup.squareMarks, drillMarkup.squareMarks, feedback, linePhase],
  );
  const onPremoveSet = useCallback((orig: string, dest: string) => {
    setQueuedPremove({ from: orig, to: dest });
  }, []);

  const startDrilling = useCallback(() => {
    if (!line) return;
    if (line.isInfoOnly || userStepIndexes.length === 0) {
      setLinePhase('line-done');
      return;
    }
    setLinePhase('drill');
    setDrillRun(1);
    setDrillPassCount(studyMode ? readLearnQuizPasses() : line.isNew ? 2 : 1);
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
    setBoardFen(toCompleteFen(firstUserStep?.parentFen ?? line.steps[0]?.parentFen));
    setLastMoveUci(undefined);
  }, [line, studyMode, userStepIndexes]);

  const continueAfterWrong = useCallback(() => {
    if (!needsManualNext) return;
    setNeedsManualNext(false);
    setFeedback(null);
    setShowAnnotation(false);
    setTracePreviewIndex(null);
    setSolutionPreviewIndex(null);
    if (!inErrorRecovery) {
      setQuestionIndex((i) => i + 1);
    }
  }, [needsManualNext, inErrorRecovery]);

  const nextLine = useCallback(() => {
    if (!lineSaved) return;
    const next = lineIndex + 1;
    if (next >= lines.length) {
      if (studyMode && line) recordLearnResume(line.courseId, null);
      setSessionPhase('done');
    } else {
      setLineIndex(next);
      if (studyMode && line) recordLearnResume(line.courseId, lines[next]?.lineId ?? null);
    }
  }, [line, lineSaved, lineIndex, lines, studyMode]);

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
          if (next <= browseLimit) setBrowseIndex(next);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setBrowseIndex(0);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setBrowseIndex(browseLimit);
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
      if (e.key === ' ' && needsManualNext && feedback) {
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
  }, [linePhase, browseIndex, browseLimit, line, waitingForUser, needsManualNext, feedback, startDrilling, continueAfterWrong, lineSaved, lineSaving, nextLine]);

  useEffect(() => {
    if (!queuedPremove || !waitingForUser || linePhase !== 'drill' || needsManualNext) return;
    const { from, to } = queuedPremove;
    setQueuedPremove(null);
    const timer = window.setTimeout(() => {
      tryMove(from, to);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [queuedPremove, waitingForUser, linePhase, needsManualNext, tryMove]);

  const handleStudyNotationMove = useCallback((san: string) => {
    if (linePhase !== 'browse') return;
    try {
      const chess = new Chess(toCompleteFen(boardFen));
      const result = chess.move(san, { strict: false });
      if (!result) return;
      setBoardFen(toCompleteFen(chess.fen()));
      setLastMoveUci([result.from, result.to]);
    } catch {
      // A prose token can look like SAN while not being legal from the
      // current position. Leave the canonical study position untouched.
    }
  }, [boardFen, linePhase]);

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

  // Keep every render branch on one phase snapshot.  The phase subtree is
  // keyed below so a browse -> drill transition cannot leave stale study DOM
  // next to the newly interactive drill controls during a concurrent commit.
  const isBrowsing = linePhase === 'browse';
  const isDrilling = linePhase === 'drill';
  const isLineDone = linePhase === 'line-done';
  const phaseKey = `${lineIndex}:${linePhase}`;
  const userMovesInLine = userStepIndexes.length;
  const playedUserMoves = lineCorrect + lineWrong;
  const betweenDrills = isDrilling && !inErrorRecovery && drillRun === 1 && questionIndex >= userMovesInLine && !feedback;
  const recoveryResolved = userMovesInLine - errorQueue.length;
  const drillProgressBase = inErrorRecovery ? recoveryResolved : questionIndex;
  const lineProgress = isBrowsing
    ? Math.round((browseIndex / Math.max(line.steps.length, 1)) * 100)
    : isLineDone
      ? 100
      : Math.round((drillProgressBase / Math.max(userMovesInLine, 1)) * 100);
  const phaseLabel = isBrowsing
    ? `Study · ${browseIndex}/${line.steps.length}`
    : isLineDone
      ? 'Line complete'
      : betweenDrills
        ? 'Starting next pass…'
        : inErrorRecovery
          ? 'Error recovery'
          : waitingForUser
            ? `Your move · ${playerColor}`
            : `Drill ${drillRun}/${drillPassCount}`;
  const browseAnnotation = isBrowsing && browseIndex > 0 ? browseMarkup.text || null : null;
  const traceUpTo = isLineDone
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
    return {
      key: `browse-${i}-${s.uci}`,
      text: `${prefix}${s.san}`,
      childFen: s.childFen,
      uci: s.uci,
      index: i,
      hasAnnotation: Boolean(
        s.annotation?.trim() || s.annotations?.arrows?.length || s.annotations?.circles?.length,
      ),
    };
  });
  const showInputPicker = isDrilling && !betweenDrills && (waitingForUser || Boolean(feedback));
  const solutionPreviewLimit = feedback?.type === 'wrong'
    ? Math.min(currentStepIndex + 1, line.steps.length)
    : line.steps.length;
  const shownSolutionPly = Math.min(
    Math.max(solutionPreviewIndex ?? currentStepIndex + 1, 0),
    solutionPreviewLimit,
  );
  const showSolutionPly = (ply: number) => {
    const nextPly = Math.min(Math.max(ply, 0), solutionPreviewLimit);
    const shownStep = nextPly > 0 ? line.steps[nextPly - 1] : undefined;
    setSolutionPreviewIndex(nextPly);
    setBoardFen(toCompleteFen(shownStep?.childFen ?? line.steps[0]?.parentFen));
    setLastMoveUci(shownStep ? [shownStep.uci.slice(0, 2), shownStep.uci.slice(2, 4)] : undefined);
  };
  const lichessFen = toCompleteFen(boardFen).replaceAll(' ', '_');
  const linePgn = buildLinePgn(line);
  const analysisUrl = linePgn
    ? `https://lichess.org/analysis/pgn/${encodeURIComponent(linePgn)}`
    : `https://lichess.org/analysis/standard/${lichessFen}?color=${playerColor}`;

  return (
    <AppSurface className="training-surface training-scroll-stable lg:py-5">
      {filterBar ? <div className="mb-3 flex min-h-9 items-start justify-end">{filterBar}</div> : null}
      <div key={phaseKey} data-training-phase={linePhase} className="contents">
      <div className="mb-4 grid items-baseline gap-3 border-b border-[color:var(--paper-edge)] pb-2 md:grid-cols-[auto_1fr_auto] md:gap-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Training · Line <span className="font-display italic text-[color:var(--ink)]">{lineIndex + 1}</span> of {lines.length}
        </p>
        <p className="truncate font-display-italic text-[15px] text-[color:var(--ink-soft)]">
          {line.courseName} <span className="text-[color:var(--ink-ghost)]">·</span> {line.chapterName}
        </p>
        <div className="flex items-center gap-3">
          <Stamp tone={isBrowsing ? 'gold' : isLineDone ? 'green' : betweenDrills ? 'gold' : 'red'}>
            {isBrowsing ? 'Study' : isLineDone ? 'Done' : betweenDrills ? 'Pass done' : inErrorRecovery ? 'Recovery' : `Drill ${drillRun}/${drillPassCount}`}
          </Stamp>
          {isDrilling && !betweenDrills && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] tabular-nums">{playedUserMoves}/{userMovesInLine}</span>
          )}
          {isLineDone && (
            <PremiumButton onClick={nextLine} disabled={!lineSaved || lineSaving}>
              {lineSaving ? 'Saving…' : lineIndex + 1 < lines.length ? 'Next line' : 'Finish session'}
            </PremiumButton>
          )}
        </div>
      </div>

      <div className="mb-6 h-px bg-[color:var(--paper-rule)]">
        <div className="h-full bg-[color:var(--margin-red)] transition-[width] duration-500 ease-out" style={{ width: `${lineProgress}%` }} />
      </div>

      <div className="training-workspace grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-10">
        <div className="training-board-column min-w-0">
          <div className="mb-3 flex items-baseline justify-between border-b border-[color:var(--paper-edge)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Diagram</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)]">{phaseLabel}</p>
          </div>

          <div className="-mx-5 overflow-x-clip md:mx-0">
            <ResizableDiagramFrame
              className="training-board-frame max-w-full -mx-2 md:mx-0"
              caption={isBrowsing ? `Move ${browseIndex} / ${line.steps.length}` : `Move ${Math.min(questionIndex + 1, userMovesInLine)} / ${userMovesInLine}`}
              fitViewport
            >
              <ChessBoard
                fen={boardFen}
                orientation={playerColor}
                // Keep one Chessground instance for an entire drill pass.
                // `movable`/`premovable` are empty while feedback is shown,
                // so the board stays inert without an avoidable remount for
                // every answer.
                viewOnly={!boardInteractive && !analysisInteractive}
                lastMove={lastMoveUci}
                movable={boardMovable}
                premovable={boardPremovable}
                onMove={analysisInteractive ? onAnalysisMove : onBoardMove}
                onPremoveSet={onPremoveSet}
                arrows={boardArrows}
                squareMarks={boardSquareMarks}
              />
            </ResizableDiagramFrame>
          </div>

        </div>

        <div className="training-side min-w-0 space-y-8 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pr-2">
          {isBrowsing && (
            <div>
              <div className="grid grid-cols-3 divide-x divide-[color:var(--paper-edge)] border border-[color:var(--paper-edge)]">
                <button type="button" onClick={() => setBrowseIndex((i) => Math.max(0, i - 1))} disabled={browseIndex === 0} className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 hover:bg-[color:var(--paper-deep)] disabled:opacity-30">← Back</button>
                <button type="button" onClick={() => { const next = browseIndex + 1; if (next <= browseLimit) setBrowseIndex(next); }} disabled={browseIndex >= browseLimit} className="px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 hover:bg-[color:var(--paper-deep)] disabled:cursor-not-allowed disabled:opacity-30">Forward →</button>
                <button type="button" onClick={startDrilling} className="bg-[color:var(--ink)] px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] transition-colors duration-200 hover:opacity-90">Start drill</button>
              </div>
            </div>
          )}

          <section>
            <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Prompt</p>
            <p className="mt-5 font-display text-3xl font-medium leading-[1.15] tracking-[-0.01em] text-[color:var(--ink)] md:text-4xl">
              {isBrowsing
                ? browseIndex === 0
                  ? <>Study this <span className="font-display-italic">line</span>.</>
                  : browseIndex >= line.steps.length
                    ? <>End of line — ready to <span className="font-display-italic">drill?</span></>
                    : <>Move {browseIndex} of {line.steps.length}.</>
                : isLineDone
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
              {isBrowsing
                ? 'Navigate with ← → · read the annotations · press Enter or Start drill when ready.'
                : isLineDone
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

          {isBrowsing && browseAnnotation && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Annotation</p>
              <StudyAnnotation text={browseAnnotation} onNotationMove={handleStudyNotationMove} />
            </section>
          )}

          {showInputPicker && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 divide-x divide-[color:var(--paper-edge)] border border-[color:var(--paper-edge)]">
                {(['mouse', 'keyboard'] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => { setInputMode(mode); if (mode === 'keyboard') setTimeout(() => notationRef.current?.focus(), 50); }} className={`px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 ${inputMode === mode ? 'bg-[color:var(--ink)] text-[color:var(--paper)]' : 'text-[color:var(--ink)] hover:bg-[color:var(--paper-deep)]'}`}>
                    {mode === 'mouse' ? 'Board' : 'Notation'}
                  </button>
                ))}
              </div>
              {isDrilling && waitingForUser && inputMode === 'keyboard' && (
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

          {feedback && (
            <section className={`border-l-2 pl-4 ${feedback.type === 'correct' ? 'border-[color:var(--library-green)]' : 'border-[color:var(--margin-red)]'}`}>
              <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${feedback.type === 'correct' ? 'text-[color:var(--library-green)]' : 'text-[color:var(--margin-red)]'}`}>
                {feedback.type === 'correct' ? '✓ Correct' : '✗ Departure from prep'}
              </p>
              <p className="notation mt-2 text-[15px] text-[color:var(--ink)]">{feedback.text}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {(feedback.type === 'wrong' || isLineDone) && (
                  <div className="inline-flex overflow-hidden rounded-md border border-[color:var(--paper-edge)]">
                    <button type="button" onClick={() => showSolutionPly(shownSolutionPly - 1)} disabled={shownSolutionPly === 0} aria-label="Previous solution move" className="px-3 py-2 font-mono text-sm transition-colors hover:bg-[color:var(--paper-deep)] disabled:cursor-not-allowed disabled:opacity-30">←</button>
                    <span className="border-x border-[color:var(--paper-edge)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">Solution {shownSolutionPly}/{solutionPreviewLimit}</span>
                    <button type="button" onClick={() => showSolutionPly(shownSolutionPly + 1)} disabled={shownSolutionPly >= solutionPreviewLimit} aria-label="Next solution move" className="px-3 py-2 font-mono text-sm transition-colors hover:bg-[color:var(--paper-deep)] disabled:cursor-not-allowed disabled:opacity-30">→</button>
                  </div>
                )}
                {feedback.type === 'wrong' && needsManualNext && (
                  <button
                    type="button"
                    onClick={continueAfterWrong}
                    className="inline-flex items-center gap-3 rounded-md border border-[color:var(--ink)] bg-[color:var(--ink)] px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--paper)] transition-colors hover:border-[color:var(--library-green)] hover:bg-[color:var(--library-green)]"
                  >
                    Continue
                    <span className="font-normal tracking-[0.08em] text-[color:var(--paper)]/65">Space</span>
                  </button>
                )}
                <a
                  href={analysisUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-md border border-[color:var(--paper-rule)] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)] transition-colors hover:border-[color:var(--library-green)] hover:text-[color:var(--library-green)]"
                >
                  Analyze line
                </a>
              </div>
            </section>
          )}

          {isLineDone && (
            <section className="border-l-2 border-[color:var(--library-green)] pl-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--library-green)]">Review the line</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex overflow-hidden rounded-md border border-[color:var(--paper-edge)]">
                  <button type="button" onClick={() => showSolutionPly(shownSolutionPly - 1)} disabled={shownSolutionPly === 0} aria-label="Previous solution move" className="px-3 py-2 font-mono text-sm transition-colors hover:bg-[color:var(--paper-deep)] disabled:cursor-not-allowed disabled:opacity-30">←</button>
                  <span className="border-x border-[color:var(--paper-edge)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">Solution {shownSolutionPly}/{line.steps.length}</span>
                  <button type="button" onClick={() => showSolutionPly(shownSolutionPly + 1)} disabled={shownSolutionPly >= line.steps.length} aria-label="Next solution move" className="px-3 py-2 font-mono text-sm transition-colors hover:bg-[color:var(--paper-deep)] disabled:cursor-not-allowed disabled:opacity-30">→</button>
                </div>
                <a href={analysisUrl} target="_blank" rel="noreferrer" aria-label="Analyze line on Lichess" title="Analyze line on Lichess" className="inline-flex h-9 items-center justify-center rounded-md border border-[color:var(--paper-rule)] px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)] transition-colors hover:border-[color:var(--library-green)] hover:text-[color:var(--library-green)]">
                  Analyze line
                </a>
              </div>
            </section>
          )}

          {(isDrilling && showAnnotation && drillMarkup.text) && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Annotation</p>
              <p data-no-translate className="marginalia mt-4 text-[15px] leading-relaxed">{drillMarkup.text}</p>
            </section>
          )}

          {isBrowsing && browseTraceTokens.length > 0 && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Line</p>
              <ol className="mt-4 flex flex-wrap gap-2">
                {browseTraceTokens.map((token) => (
                  <li key={token.key} className={`notation cursor-pointer rounded-lg px-2.5 py-1 text-[16px] leading-none transition-colors duration-150 md:text-[17px] ${browseIndex === token.index + 1 ? 'bg-[color:var(--ink)] text-[color:var(--paper)]' : line.steps[token.index]?.isUserMove ? 'bg-[color:var(--paper-deep)] text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]' : token.hasAnnotation ? 'bg-[color:var(--library-green)]/15 text-[color:var(--library-green)] hover:bg-[color:var(--library-green)]/25' : 'bg-transparent text-[color:var(--ink-soft)] hover:bg-[color:var(--paper-edge)]'}`} onClick={() => setBrowseIndex(Math.min(token.index + 1, browseLimit))}>
                    {token.text}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {isDrilling && drillTraceTokens.length > 0 && (
            <section>
              <p className="border-b border-[color:var(--paper-edge)] pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Trace</p>
              <ol className="mt-4 flex flex-wrap gap-2">
                {drillTraceTokens.map((token) => (
                  <li key={token.key} className={`notation rounded-lg px-2.5 py-1 text-[16px] leading-none transition-colors duration-150 md:text-[17px] ${tracePreviewIndex === token.index ? 'bg-[color:var(--ink-faint)] text-[color:var(--paper)]' : 'bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--paper-edge)]'} ${needsManualNext && feedback?.type === 'wrong' ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => {
                    if (!(needsManualNext && feedback?.type === 'wrong')) return;
                    setTracePreviewIndex(token.index);
                    setBoardFen(toCompleteFen(token.childFen));
                    setLastMoveUci([token.uci.slice(0, 2), token.uci.slice(2, 4)]);
                  }}>
                    {token.text}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {isLineDone && (
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
      </div>
    </AppSurface>
  );
}

const SAN_TOKEN = /^(?:O-O(?:-O)?|0-0(?:-0)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)$/i;

function splitNotationToken(token: string) {
  const match = token.match(/^([([{]*)(?:(?:\d+\.{1,3}|\.{3})?)([^\s]+?)([.,;:!?)}\]]*)$/);
  if (!match) return null;
  const [, prefix, rawMove, suffix] = match;
  const move = rawMove.replace(/[.,;:!?)}\]]+$/, '');
  if (!SAN_TOKEN.test(move)) return null;
  return { prefix, move, suffix };
}

/** Render book prose while making SAN-looking tokens useful in study mode. */
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
