'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChessBoard } from '@/components/board/ChessBoard';
import {
  AppSurface,
  BackLink,
  GhostButton,
  PremiumButton,
  SecondaryButton,
  Stamp,
} from '@/components/ui/Premium';
import {
  BOOK_METHODS,
  isBookMethodEnabled,
  readBookMethodProgress,
  recordBookMethodSolve,
  startNextBookMethodCycle,
  type BookMethodProgress,
  type BookTrainingKey,
} from '@/lib/bookTrainingPreferences';
import {
  getBookProgressEventName,
  readBookPuzzleProgress,
  recordBookPuzzleMissed,
  recordBookPuzzleSolved,
  type BookPuzzleProgress,
} from '@/lib/woodpeckerProgress';
import { solutionPdfPage } from '@/lib/woodpeckerPdf';

type BookPuzzle = {
  exercise: number;
  section: string;
  fen: string;
  turn: 'white' | 'black';
  solutionSan: string[];
  solutionUci: string[];
  solutionText: string;
  whitePlayer: string | null;
  blackPlayer: string | null;
  event: string | null;
  year: number | null;
  game: string;
  bookPage: number;
  pdfPage?: number;
};

type PuzzleSolution = { solutionSan: string[]; solutionUci: string[] };
type TrainerStatus = 'ready' | 'wrong' | 'correct' | 'revealed';

const forcedRecheckExercise = 110;

export function WoodpeckerTrainer({
  puzzle,
  total,
  courseKey = 'woodpecker-method',
  courseSlug = 'woodpecker',
  sourcePdfAvailable = false,
}: {
  puzzle: BookPuzzle;
  total: number;
  courseKey?: BookTrainingKey;
  courseSlug?: string;
  sourcePdfAvailable?: boolean;
}) {
  const router = useRouter();
  const method = BOOK_METHODS[courseKey];
  const replyTimer = useRef<number | null>(null);
  const [fen, setFen] = useState(puzzle.fen);
  const [ply, setPly] = useState(0);
  const [status, setStatus] = useState<TrainerStatus>('ready');
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [progress, setProgress] = useState<BookPuzzleProgress>(() => readBookPuzzleProgress(courseKey));
  const [methodEnabled, setMethodEnabled] = useState(true);
  const [methodProgress, setMethodProgress] = useState<BookMethodProgress>(() => readBookMethodProgress(courseKey));
  const [solution, setSolution] = useState<PuzzleSolution>({
    solutionSan: puzzle.solutionSan,
    solutionUci: puzzle.solutionUci,
  });
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDraft, setCorrectionDraft] = useState('');
  const [correctionError, setCorrectionError] = useState('');
  const [hintVisible, setHintVisible] = useState(false);

  const solutionStorageKey = `repdrill:${courseKey}:solution-overrides`;
  const isWoodpeckerOne = courseKey === 'woodpecker-method';
  const isForcedRecheck = isWoodpeckerOne && puzzle.exercise === forcedRecheckExercise;
  const answerPdfPage = isWoodpeckerOne ? solutionPdfPage(puzzle.exercise) : null;

  useEffect(() => {
    const refreshProgress = () => setProgress(readBookPuzzleProgress(courseKey));
    const eventName = getBookProgressEventName();
    window.addEventListener(eventName, refreshProgress);
    window.addEventListener('storage', refreshProgress);
    refreshProgress();
    setMethodEnabled(isBookMethodEnabled(courseKey));
    setMethodProgress(readBookMethodProgress(courseKey));
    return () => {
      window.removeEventListener(eventName, refreshProgress);
      window.removeEventListener('storage', refreshProgress);
    };
  }, [courseKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const values = JSON.parse(window.localStorage.getItem(solutionStorageKey) ?? '{}') as Record<string, PuzzleSolution>;
      const override = values[String(puzzle.exercise)];
      if (override?.solutionUci?.length && override.solutionSan?.length) {
        setSolution({ solutionSan: override.solutionSan, solutionUci: override.solutionUci });
      } else {
        setSolution({ solutionSan: puzzle.solutionSan, solutionUci: puzzle.solutionUci });
      }
    } catch {
      setSolution({ solutionSan: puzzle.solutionSan, solutionUci: puzzle.solutionUci });
    }
  }, [puzzle.exercise, puzzle.solutionSan, puzzle.solutionUci, solutionStorageKey]);

  useEffect(() => () => {
    if (replyTimer.current) window.clearTimeout(replyTimer.current);
  }, []);

  const legalDests = useMemo(() => {
    if (status !== 'ready') return new Map<string, string[]>();
    try {
      const chess = new Chess(fen, { skipValidation: true });
      const dests = new Map<string, string[]>();
      for (const move of chess.moves({ verbose: true })) {
        const values = dests.get(move.from) ?? [];
        values.push(move.to);
        dests.set(move.from, values);
      }
      return dests;
    } catch {
      return new Map<string, string[]>();
    }
  }, [fen, status]);

  const playPly = (positionFen: string, uci: string) => {
    try {
      const chess = new Chess(positionFen, { skipValidation: true });
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] as 'q' | 'r' | 'b' | 'n' | undefined,
      });
      if (!move) return null;
      return { fen: chess.fen(), lastMove: [move.from, move.to] as [string, string] };
    } catch {
      return null;
    }
  };

  const playSolution = () => {
    let position = puzzle.fen;
    let move: [string, string] | undefined;
    for (const uci of solution.solutionUci) {
      const next = playPly(position, uci);
      if (!next) break;
      position = next.fen;
      move = next.lastMove;
    }
    return { fen: position, lastMove: move };
  };

  const updateProgress = (next: BookPuzzleProgress) => setProgress(next);

  const goTo = (exercise: number) => {
    router.push(`/train/puzzles/${courseSlug}?n=${Math.min(Math.max(exercise, 1), total)}`);
  };

  const remainingMissed = progress.missed.filter((exercise) => exercise !== puzzle.exercise);
  const nextExercise = () => {
    if (remainingMissed.length > 0) return remainingMissed[0];
    return puzzle.exercise < total ? puzzle.exercise + 1 : null;
  };

  const resetBoard = () => {
    if (replyTimer.current) window.clearTimeout(replyTimer.current);
    replyTimer.current = null;
    setFen(puzzle.fen);
    setPly(0);
    setLastMove(undefined);
    setStatus('ready');
    setHintVisible(false);
  };

  const finishSolved = () => {
    const next = recordBookPuzzleSolved(courseKey, puzzle.exercise);
    updateProgress(next);
    if (methodEnabled && puzzle.exercise <= method.recommendedSetSize) {
      setMethodProgress(recordBookMethodSolve(courseKey, puzzle.exercise));
    }
    const final = playSolution();
    setFen(final.fen);
    setLastMove(final.lastMove);
    setPly(solution.solutionUci.length);
    setStatus('correct');
  };

  const markMissed = () => updateProgress(recordBookPuzzleMissed(courseKey, puzzle.exercise));

  const onMove = (from: string, to: string) => {
    // Once an answer has been submitted (including a wrong one), the board is
    // an ordinary analysis board.  The user can make legal moves and follow
    // the position on Lichess without losing the recorded result.
    if (status !== 'ready') {
      try {
        const chess = new Chess(fen, { skipValidation: true });
        const move = chess.move({ from, to });
        if (move) {
          setFen(chess.fen());
          setLastMove([move.from, move.to]);
        }
      } catch {
        // Chessground snaps back when the free analysis move is illegal.
      }
      return;
    }
    // The opponent reply is animated for a moment after a correct move. Do
    // not accept a second user move against the pre-reply position.
    if (replyTimer.current) return;

    const expected = solution.solutionUci[ply];
    if (!expected) return;
    try {
      const chess = new Chess(fen, { skipValidation: true });
      const move = chess.move({
        from,
        to,
        promotion: expected[4] as 'q' | 'r' | 'b' | 'n' | undefined,
      });
      const attempted = move ? `${move.from}${move.to}${move.promotion ?? ''}` : `${from}${to}`;
      if (!move || attempted !== expected) {
        markMissed();
        setFen(puzzle.fen);
        setPly(0);
        setLastMove(undefined);
        setStatus('wrong');
        return;
      }

      setFen(chess.fen());
      setLastMove([move.from, move.to]);
      const replyIndex = ply + 1;
      if (replyIndex >= solution.solutionUci.length) {
        finishSolved();
        return;
      }

      setStatus('ready');
      replyTimer.current = window.setTimeout(() => {
        replyTimer.current = null;
        const reply = playPly(chess.fen(), solution.solutionUci[replyIndex]);
        if (!reply) {
          finishSolved();
          return;
        }
        setFen(reply.fen);
        setLastMove(reply.lastMove);
        const nextUserPly = replyIndex + 1;
        if (nextUserPly >= solution.solutionUci.length) {
          finishSolved();
          return;
        }
        setPly(nextUserPly);
        setStatus('ready');
      }, 420);
    } catch {
      markMissed();
      setFen(puzzle.fen);
      setPly(0);
      setLastMove(undefined);
      setStatus('wrong');
    }
  };

  const reveal = () => {
    markMissed();
    const final = playSolution();
    setFen(final.fen);
    setLastMove(final.lastMove);
    setPly(solution.solutionUci.length);
    setStatus('revealed');
  };

  const giveHint = () => {
    markMissed();
    setHintVisible(true);
  };

  const reviewMissed = () => {
    if (progress.missed.length > 0) goTo(progress.missed[0]);
  };

  const openCorrection = () => {
    setCorrectionDraft(solution.solutionSan.join(' '));
    setCorrectionError('');
    setCorrectionOpen(true);
  };

  const saveCorrection = () => {
    try {
      const parsed = parseCorrectionNotation(puzzle.fen, correctionDraft);
      if (!parsed.solutionUci.length) throw new Error('Enter at least one legal move.');
      const values = typeof window === 'undefined'
        ? {}
        : JSON.parse(window.localStorage.getItem(solutionStorageKey) ?? '{}') as Record<string, PuzzleSolution>;
      values[String(puzzle.exercise)] = parsed;
      window.localStorage.setItem(solutionStorageKey, JSON.stringify(values));
      setSolution(parsed);
      setCorrectionOpen(false);
      setCorrectionError('');
      resetBoard();
    } catch (error) {
      setCorrectionError(error instanceof Error ? error.message : 'Could not save this line.');
    }
  };

  const answerVisible = status === 'correct' || status === 'revealed';
  const analysisMode = status !== 'ready';
  const firstMove = solution.solutionUci[0];
  const lichessUrl = `https://lichess.org/analysis/standard/${puzzle.fen.replaceAll(' ', '_')}?color=${puzzle.turn}`;
  const cleanSolutionText = puzzle.solutionText.replace(/\uF0FC/g, '').replace(/\s{2,}/g, ' ').trim();
  const next = nextExercise();

  return (
    <AppSurface className="pb-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <BackLink href={`/courses/${courseSlug}`}>Course overview</BackLink>
        <div className="flex flex-wrap items-center gap-3">
          <Stamp tone="red">Puzzle mode</Stamp>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
            {progress.solved.length} / {total} solved
          </span>
          {progress.missed.length > 0 && (
            <button
              type="button"
              onClick={reviewMissed}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--margin-red)] underline decoration-current/30 underline-offset-4"
            >
              {progress.missed.length} missed · review
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(420px,680px)_minmax(300px,1fr)] xl:items-start">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                {puzzle.section} · position {puzzle.exercise} of {total}
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
                {puzzle.turn === 'white' ? 'White' : 'Black'} to move
              </h1>
            </div>
            {methodEnabled ? (
              <Link
                href="/settings#book-methods"
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--library-green)] underline decoration-current/30 underline-offset-4"
              >
                Author method on
              </Link>
            ) : (
              <GhostButton onClick={() => goTo(Math.floor(Math.random() * total) + 1)}>Random</GhostButton>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-2 shadow-[0_22px_70px_rgba(47,58,50,0.12)]">
            <ChessBoard
              fen={fen}
              orientation={puzzle.turn}
              lastMove={lastMove}
              viewOnly={solution.solutionUci.length === 0}
              movable={analysisMode
                ? { free: true, color: 'both', showDests: false }
                : { color: puzzle.turn, dests: legalDests, showDests: true }}
              arrows={(answerVisible || hintVisible) && firstMove
                ? [{ orig: firstMove.slice(0, 2), dest: firstMove.slice(2, 4), brush: 'green' }]
                : undefined}
              onMove={onMove}
            />
          </div>
          {analysisMode && (
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
              Free analysis · move pieces here or open the position on Lichess
            </p>
          )}
        </section>

        <aside className="xl:pt-[5.4rem]">
          <div className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-6 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">From the game</p>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.025em]">
              {puzzle.whitePlayer ?? 'White'} — {puzzle.blackPlayer ?? 'Black'}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">{[puzzle.event, puzzle.year].filter(Boolean).join(', ')}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">Book page {puzzle.bookPage}</p>

            <div className="my-6 border-t border-[color:var(--paper-rule)]" />

            {isForcedRecheck && (
              <p className="mb-5 rounded-md bg-[color:var(--paper-shade)] px-4 py-3 text-xs leading-relaxed text-[color:var(--margin-red)]">
                Mandatory recheck · exercise 110 is kept in the Woodpecker set because its original key was corrected.
              </p>
            )}
            {status === 'wrong' && (
              <p className="mb-5 rounded-md bg-[color:var(--paper-shade)] px-4 py-3 text-sm text-[color:var(--margin-red)]">
                That move misses the current key. This puzzle is in your missed queue; you can analyse the position, retry, or check the source.
              </p>
            )}
            {solution.solutionUci.length === 0 && (
              <p className="mb-5 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                The book explanation is available, but this line could not be converted into a fully legal interactive sequence.
              </p>
            )}

            {answerVisible ? (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--library-green)]">
                  {status === 'correct' ? 'Solved' : 'Solution revealed · marked missed'}
                </p>
                <p className="notation mt-3 font-display text-xl font-semibold text-[color:var(--ink)]">
                  {solution.solutionSan.join(' ') || 'See the author’s note below.'}
                </p>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[color:var(--ink-soft)]">{cleanSolutionText}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <a
                    href={lichessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--library-green)] underline decoration-current/30 underline-offset-4"
                  >
                    Analyse on Lichess ↗
                  </a>
                  {progress.missed.length > 0 && (
                    <button type="button" onClick={reviewMissed} className="font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--margin-red)] underline decoration-current/30 underline-offset-4">
                      Review missed ({progress.missed.length})
                    </button>
                  )}
                </div>
                <PremiumButton onClick={() => next && goTo(next)} disabled={!next} className="mt-7">
                  {remainingMissed.length > 0 ? `Next missed · ${remainingMissed.length} left` : 'Next position'}
                </PremiumButton>
              </div>
            ) : status === 'wrong' ? (
              <div>
                <div className="flex flex-wrap items-center gap-4">
                  <SecondaryButton onClick={resetBoard}>Try again</SecondaryButton>
                  <a href={lichessUrl} target="_blank" rel="noreferrer" className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--library-green)] underline decoration-current/30 underline-offset-4">Analyse on Lichess ↗</a>
                </div>
                <button type="button" onClick={openCorrection} className="mt-5 font-mono text-[10px] uppercase tracking-[0.13em] text-[color:var(--ink-faint)] underline decoration-current/30 underline-offset-4">
                  Key looks wrong? Open the book and correct it
                </button>
                <button type="button" onClick={reveal} className="mt-3 block font-mono text-[10px] uppercase tracking-[0.13em] text-[color:var(--ink-faint)] underline decoration-current/30 underline-offset-4">
                  Show solution (keeps this in missed)
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm leading-relaxed text-[color:var(--ink-soft)]">
                  {method.kind === 'positional'
                    ? 'Choose the move that best carries out the position’s plan. RepDrill will compare it with the author’s move and explanation.'
                    : 'Find the strongest move and play it on the board. RepDrill will answer with the book line.'}
                </p>
                {hintVisible && firstMove && (
                  <p className="mt-4 rounded-md bg-[color:var(--paper-shade)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.13em] text-[color:var(--library-green)]">
                    Hint: look at {firstMove.slice(0, 2)} → {firstMove.slice(2, 4)} · this position is in missed
                  </p>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <SecondaryButton onClick={reveal}>Show solution · mark missed</SecondaryButton>
                  {!hintVisible && <button type="button" onClick={giveHint} className="font-mono text-[10px] uppercase tracking-[0.13em] text-[color:var(--ink-faint)] underline decoration-current/30 underline-offset-4">Give me a hint · mark missed</button>}
                </div>
              </div>
            )}
          </div>

          {methodEnabled && <MethodProgressCard courseKey={courseKey} progress={methodProgress} onAdvance={() => { setMethodProgress(startNextBookMethodCycle(courseKey)); goTo(1); }} />}

          <div className="mt-4 flex items-center justify-between gap-3">
            <GhostButton onClick={() => goTo(puzzle.exercise - 1)} disabled={puzzle.exercise <= 1}>← Previous</GhostButton>
            <GhostButton onClick={() => next && goTo(next)} disabled={!next}>Next →</GhostButton>
          </div>

          {correctionOpen && (
            <CorrectionWorkspace
              draft={correctionDraft}
              error={correctionError}
              saving={false}
              answerPdfPage={answerPdfPage}
              sourcePdfAvailable={sourcePdfAvailable}
              exercise={puzzle.exercise}
              onChange={setCorrectionDraft}
              onSave={saveCorrection}
              onClose={() => setCorrectionOpen(false)}
            />
          )}
        </aside>
      </div>
    </AppSurface>
  );
}

function CorrectionWorkspace({
  draft,
  error,
  saving,
  answerPdfPage,
  sourcePdfAvailable,
  exercise,
  onChange,
  onSave,
  onClose,
}: {
  draft: string;
  error: string;
  saving: boolean;
  answerPdfPage: number | null;
  sourcePdfAvailable: boolean;
  exercise: number;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--paper-shade)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--library-green)]">Source correction</p>
          <h3 className="mt-2 font-display text-xl font-semibold">Check the book’s answer</h3>
        </div>
        <button type="button" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">Close</button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[color:var(--ink-soft)]">Edit one legal line per row. SAN and coordinate notation are accepted. Your correction stays on this device and is used for later attempts.</p>
      <textarea
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-4 w-full resize-y rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3 py-2 font-mono text-xs leading-relaxed text-[color:var(--ink)] outline-none focus:border-[color:var(--library-green)]"
        aria-label={`Corrected solution for exercise ${exercise}`}
      />
      {error && <p className="mt-2 text-xs text-[color:var(--margin-red)]" role="alert">{error}</p>}
      <button type="button" onClick={onSave} disabled={saving} className="mt-4 rounded-md bg-[color:var(--ink)] px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--paper)] disabled:opacity-60">Save corrected key</button>
      {answerPdfPage && sourcePdfAvailable ? (
        <div className="mt-5 overflow-hidden rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--paper-rule)] px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">Book answer · page {answerPdfPage - 1}</span>
            <a href={`/api/source-documents/woodpecker#page=${answerPdfPage}`} target="_blank" rel="noreferrer" className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--library-green)] underline decoration-current/30 underline-offset-4">Full page ↗</a>
          </div>
          <iframe key={`${exercise}-${answerPdfPage}`} src={`/api/source-documents/woodpecker#page=${answerPdfPage}&view=FitH`} title={`Woodpecker Method answer for exercise ${exercise}`} className="h-[30rem] w-full border-0" />
        </div>
      ) : answerPdfPage ? (
        <p className="mt-5 rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3 py-3 text-xs leading-relaxed text-[color:var(--ink-soft)]">
          Source PDF preview is not configured on this deployment. You can still save a corrected key locally; no book file or private source URL is bundled with the app.
        </p>
      ) : null}
    </div>
  );
}

function parseCorrectionNotation(fen: string, draft: string): PuzzleSolution {
  const lines = draft.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error('Enter at least one line.');
  const parsedLines = lines.map((line) => {
    const chess = new Chess(fen, { skipValidation: true });
    const solutionSan: string[] = [];
    const solutionUci: string[] = [];
    const tokens = line
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .split(/\s+/)
      .map((token) => token
        .replace(/^\d+\.(?:\.\.)?/, '')
        .replace(/^[…]+/, '')
        .replace(/[!?+#]+/g, '')
        .replace(/[+\-−–—]+$/g, ''))
      .filter((token) => token && !/^\d+\.*$/.test(token) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token));
    for (const token of tokens) {
      try {
        const coordinate = token.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i);
        const move = coordinate
          ? chess.move({ from: coordinate[1], to: coordinate[2], promotion: coordinate[3]?.toLowerCase() as 'q' | 'r' | 'b' | 'n' | undefined })
          : chess.move(token);
        if (!move) throw new Error(`Invalid move ${token}`);
        solutionSan.push(move.san);
        solutionUci.push(`${move.from}${move.to}${move.promotion ?? ''}`);
      } catch {
        throw new Error(`Could not parse “${token}” from the starting position.`);
      }
    }
    return { solutionSan, solutionUci };
  });
  return parsedLines[0];
}

function MethodProgressCard({
  courseKey,
  progress,
  onAdvance,
}: {
  courseKey: BookTrainingKey;
  progress: BookMethodProgress;
  onAdvance: () => void;
}) {
  const method = BOOK_METHODS[courseKey];
  const solved = progress.solved.filter((exercise) => exercise <= method.recommendedSetSize).length;
  const complete = solved >= method.recommendedSetSize;
  const targetDays = method.targetDays[progress.cycle - 1];
  const lateCycle = progress.cycle >= 6;

  return (
    <div className="mt-4 rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--paper-shade)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--library-green)]">Author’s cadence · Cycle {progress.cycle} of 7</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">{solved}/{method.recommendedSetSize} positions · target {targetDays} {targetDays === 1 ? 'day' : 'days'}</p>
        </div>
        <Link href="/documentation/woodpecker-method" className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] underline-offset-4">Why this cadence?</Link>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[color:var(--ink-faint)]">{method.kind === 'positional' && progress.cycle <= 2 ? 'Take the time to understand the complete explanation; speed becomes the priority in later cycles.' : lateCycle ? 'Prioritize immediate pattern recognition, but still check the critical continuation.' : 'Choose a move in every position and calculate the continuation before committing.'}</p>
      {complete && progress.cycle < 7 && <button type="button" onClick={onAdvance} className="mt-4 border-b border-[color:var(--library-green)] pb-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--library-green)]">Start next cycle after a 1-day to 1-week break →</button>}
    </div>
  );
}
