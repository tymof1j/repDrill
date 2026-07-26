'use client';

import { useEffect, useMemo, useState } from 'react';
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
};

export function WoodpeckerTrainer({
  puzzle,
  total,
  courseKey = 'woodpecker-method',
  courseSlug = 'woodpecker',
}: {
  puzzle: BookPuzzle;
  total: number;
  courseKey?: BookTrainingKey;
  courseSlug?: string;
}) {
  const router = useRouter();
  const method = BOOK_METHODS[courseKey];
  const progressKey =
    courseKey === 'woodpecker-method'
      ? 'repdrill:woodpecker:solved'
      : `repdrill:${courseKey}:solved`;
  const [fen, setFen] = useState(puzzle.fen);
  const [ply, setPly] = useState(0);
  const [status, setStatus] = useState<'ready' | 'wrong' | 'correct' | 'revealed'>('ready');
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [solvedCount, setSolvedCount] = useState(0);
  const [boardKey, setBoardKey] = useState(puzzle.exercise);
  const [methodEnabled, setMethodEnabled] = useState(true);
  const [methodProgress, setMethodProgress] = useState<BookMethodProgress>({
    cycle: 1,
    solved: [],
    startedAt: new Date(0).toISOString(),
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSolvedCount(readSolved(progressKey).size);
      setMethodEnabled(isBookMethodEnabled(courseKey));
      setMethodProgress(readBookMethodProgress(courseKey));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [courseKey, progressKey]);

  const legalDests = useMemo(() => {
    const chess = new Chess(fen);
    const dests = new Map<string, string[]>();
    for (const move of chess.moves({ verbose: true })) {
      const values = dests.get(move.from) ?? [];
      values.push(move.to);
      dests.set(move.from, values);
    }
    return dests;
  }, [fen]);

  const goTo = (exercise: number) => {
    router.push(`/train/puzzles/${courseSlug}?n=${Math.min(Math.max(exercise, 1), total)}`);
  };

  const finish = () => {
    const solved = readSolved(progressKey);
    solved.add(puzzle.exercise);
    window.localStorage.setItem(progressKey, JSON.stringify([...solved]));
    setSolvedCount(solved.size);
    if (methodEnabled && puzzle.exercise <= method.recommendedSetSize) {
      setMethodProgress(recordBookMethodSolve(courseKey, puzzle.exercise));
    }
    setStatus('correct');
  };

  const playPly = (positionFen: string, uci: string) => {
    const chess = new Chess(positionFen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined;
    const move = chess.move({ from, to, promotion });
    if (!move) return null;
    return { fen: chess.fen(), lastMove: [from, to] as [string, string] };
  };

  const onMove = (from: string, to: string) => {
    if (status === 'correct' || status === 'revealed') return;
    const expected = puzzle.solutionUci[ply];
    const attempted = `${from}${to}`;
    if (!expected || !expected.startsWith(attempted)) {
      setFen(puzzle.fen);
      setPly(0);
      setLastMove(undefined);
      setBoardKey((value) => value + 1);
      setStatus('wrong');
      return;
    }

    const userResult = playPly(fen, expected);
    if (!userResult) return;
    setFen(userResult.fen);
    setLastMove(userResult.lastMove);
    setStatus('ready');

    const replyIndex = ply + 1;
    if (replyIndex >= puzzle.solutionUci.length) {
      finish();
      return;
    }

    window.setTimeout(() => {
      const reply = playPly(userResult.fen, puzzle.solutionUci[replyIndex]);
      if (!reply) {
        finish();
        return;
      }
      setFen(reply.fen);
      setLastMove(reply.lastMove);
      const nextUserPly = replyIndex + 1;
      setPly(nextUserPly);
      if (nextUserPly >= puzzle.solutionUci.length) finish();
    }, 420);
  };

  const reveal = () => {
    setFen(puzzle.fen);
    setPly(0);
    setLastMove(undefined);
    setBoardKey((value) => value + 1);
    setStatus('revealed');
  };

  const firstMove = puzzle.solutionUci[0];
  const answerVisible = status === 'correct' || status === 'revealed';
  const randomExercise = () => goTo(Math.floor(Math.random() * total) + 1);
  const cleanSolutionText = puzzle.solutionText.replace(/\uF0FC/g, '').replace(/\s{2,}/g, ' ').trim();

  return (
    <AppSurface className="pb-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <BackLink href={`/courses/${courseSlug}`}>Course overview</BackLink>
        <div className="flex items-center gap-3">
          <Stamp tone="red">Puzzle mode</Stamp>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
            {solvedCount} solved
          </span>
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
              <GhostButton onClick={randomExercise}>Random</GhostButton>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-2 shadow-[0_22px_70px_rgba(47,58,50,0.12)]">
            <ChessBoard
              key={boardKey}
              fen={fen}
              orientation={puzzle.turn}
              lastMove={lastMove}
              viewOnly={answerVisible || puzzle.solutionUci.length === 0}
              movable={{
                color: puzzle.turn,
                dests: legalDests,
                showDests: true,
              }}
              arrows={
                answerVisible && firstMove
                  ? [{ orig: firstMove.slice(0, 2), dest: firstMove.slice(2, 4), brush: 'green' }]
                  : undefined
              }
              onMove={onMove}
            />
          </div>
        </section>

        <aside className="xl:pt-[5.4rem]">
          <div className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-6 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
              From the game
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.025em]">
              {puzzle.whitePlayer ?? 'White'} — {puzzle.blackPlayer ?? 'Black'}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              {[puzzle.event, puzzle.year].filter(Boolean).join(', ')}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
              Book page {puzzle.bookPage}
            </p>

            <div className="my-6 border-t border-[color:var(--paper-rule)]" />

            {status === 'wrong' && (
              <p className="mb-5 rounded-md bg-[color:var(--paper-shade)] px-4 py-3 text-sm text-[color:var(--margin-red)]">
                That move misses the idea. The position is reset — calculate once more.
              </p>
            )}
            {puzzle.solutionUci.length === 0 && (
              <p className="mb-5 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                The book explanation is available, but this line could not be converted into a fully legal interactive sequence.
              </p>
            )}

            {answerVisible ? (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--library-green)]">
                  {status === 'correct' ? 'Solved' : 'Solution revealed'}
                </p>
                <p className="notation mt-3 font-display text-xl font-semibold text-[color:var(--ink)]">
                  {puzzle.solutionSan.join(' ') || 'See the author’s note below.'}
                </p>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[color:var(--ink-soft)]">
                  {cleanSolutionText}
                </p>
                <PremiumButton
                  onClick={() => goTo(puzzle.exercise + 1)}
                  disabled={puzzle.exercise >= total}
                  className="mt-7"
                >
                  Next position
                </PremiumButton>
              </div>
            ) : (
              <div>
                <p className="text-sm leading-relaxed text-[color:var(--ink-soft)]">
                  {method.kind === 'positional'
                    ? 'Choose the move that best carries out the position’s plan. RepDrill will compare it with the author’s move and explanation.'
                    : 'Find the strongest move and play it on the board. RepDrill will answer with the book line.'}
                </p>
                <SecondaryButton onClick={reveal} className="mt-6">
                  Show solution
                </SecondaryButton>
              </div>
            )}
          </div>

          {methodEnabled && (
            <MethodProgressCard
              courseKey={courseKey}
              progress={methodProgress}
              onAdvance={() => {
                setMethodProgress(startNextBookMethodCycle(courseKey));
                goTo(1);
              }}
            />
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <GhostButton onClick={() => goTo(puzzle.exercise - 1)} disabled={puzzle.exercise <= 1}>
              ← Previous
            </GhostButton>
            <GhostButton onClick={() => goTo(puzzle.exercise + 1)} disabled={puzzle.exercise >= total}>
              Next →
            </GhostButton>
          </div>
        </aside>
      </div>
    </AppSurface>
  );
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
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--library-green)]">
            Author’s cadence · Cycle {progress.cycle} of 7
          </p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            {solved}/{method.recommendedSetSize} positions · target {targetDays}{' '}
            {targetDays === 1 ? 'day' : 'days'}
          </p>
        </div>
        <Link
          href="/documentation/woodpecker-method"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] underline-offset-4"
        >
          Why this cadence?
        </Link>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[color:var(--ink-faint)]">
        {method.kind === 'positional' && progress.cycle <= 2
          ? 'Take the time to understand the complete explanation; speed becomes the priority in later cycles.'
          : lateCycle
            ? 'Prioritize immediate pattern recognition, but still check the critical continuation.'
            : 'Choose a move in every position and calculate the continuation before committing.'}
      </p>
      {complete && progress.cycle < 7 && (
        <button
          type="button"
          onClick={onAdvance}
          className="mt-4 border-b border-[color:var(--library-green)] pb-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--library-green)]"
        >
          Start next cycle after a 1-day to 1-week break →
        </button>
      )}
    </div>
  );
}

function readSolved(progressKey: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(progressKey) ?? '[]');
    return new Set<number>(Array.isArray(value) ? value.filter(Number.isFinite) : []);
  } catch {
    return new Set<number>();
  }
}
