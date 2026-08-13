'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@/lib/supabase/client';
import { api } from '@/lib/supabase/api';
import {
  BOOK_METHODS,
  isBookMethodEnabled,
  recordBookMethodSolve,
  startNextBookMethodCycle,
  type BookTrainingKey,
} from '@/lib/bookTrainingPreferences';
import {
  cacheBookProgressSnapshot,
  getBookProgressEventName,
  hasLocalBookProgress,
  isLocalBookProgressSnapshot,
  readLocalBookProgressSnapshot,
  recordBookPuzzleMissed,
  recordBookPuzzleSolved,
  type BookProgressSnapshot,
} from '@/lib/woodpeckerProgress';

type PendingAttempt = {
  attemptId: string;
  puzzle: number;
  success: boolean;
  durationMs?: number;
};

const pendingAttemptsKey = (book: BookTrainingKey) => `repdrill:${book}:pending-attempts`;

function readPendingAttempts(book: BookTrainingKey): PendingAttempt[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(pendingAttemptsKey(book)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((attempt): attempt is PendingAttempt => (
      typeof attempt?.attemptId === 'string'
      && Number.isInteger(attempt.puzzle)
      && attempt.puzzle > 0
      && typeof attempt.success === 'boolean'
      && (attempt.durationMs === undefined || Number.isFinite(attempt.durationMs))
    ));
  } catch {
    return [];
  }
}

function writePendingAttempts(book: BookTrainingKey, attempts: PendingAttempt[]) {
  if (typeof window === 'undefined') return;
  try {
    if (attempts.length > 0) {
      window.localStorage.setItem(pendingAttemptsKey(book), JSON.stringify(attempts));
    } else {
      window.localStorage.removeItem(pendingAttemptsKey(book));
    }
  } catch {
    // The live mutation still runs when an offline queue cannot be persisted.
  }
}

function queuePendingAttempt(book: BookTrainingKey, attempt: PendingAttempt) {
  const pending = readPendingAttempts(book);
  if (!pending.some((item) => item.attemptId === attempt.attemptId)) pending.push(attempt);
  writePendingAttempts(book, pending);
}

function removePendingAttempt(book: BookTrainingKey, attemptId: string) {
  writePendingAttempts(
    book,
    readPendingAttempts(book).filter((attempt) => attempt.attemptId !== attemptId),
  );
}

function newAttemptId(book: BookTrainingKey, puzzle: number) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${book}:${puzzle}:${suffix}`;
}

function localMigrationKey(progress: BookProgressSnapshot) {
  const serialized = JSON.stringify({
    cycle: progress.cycle,
    position: progress.position,
    setSize: progress.setSize,
    solved: progress.solved,
    missed: progress.missed,
    startedAt: progress.startedAt,
  });
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `repdrill-local-v1-${(hash >>> 0).toString(16)}`;
}

function applyAttempt(
  progress: BookProgressSnapshot,
  puzzle: number,
  success: boolean,
): BookProgressSnapshot {
  const solved = new Set(progress.solved);
  const missed = new Set(progress.missed);
  let unresolvedMissedCount = progress.unresolvedMissedCount;
  let missedCount = progress.missedCount;
  const wasSolved = solved.has(puzzle);
  const wasMissed = missed.has(puzzle);
  const resolvesUnidentifiedMiss = !wasSolved
    && !wasMissed
    && puzzle === progress.position
    && unresolvedMissedCount > 0;

  if (success) {
    solved.add(puzzle);
    missed.delete(puzzle);
    if (resolvesUnidentifiedMiss) {
      unresolvedMissedCount -= 1;
      missedCount = Math.max(0, missedCount - 1);
    } else if (wasMissed) {
      missedCount = Math.max(0, missedCount - 1);
    }
  } else if (!wasSolved) {
    missed.add(puzzle);
    if (resolvesUnidentifiedMiss) {
      unresolvedMissedCount -= 1;
    } else if (!wasMissed) {
      missedCount += 1;
    }
  }

  const solvedList = [...solved].sort((a, b) => a - b);
  const missedList = [...missed].sort((a, b) => a - b);
  const updatedAt = Date.now();
  return {
    ...progress,
    position: success ? Math.max(progress.position, puzzle + 1) : progress.position,
    solved: solvedList,
    missed: missedList,
    solvedCount: solvedList.length,
    missedCount,
    unresolvedMissedCount,
    attemptCount: progress.attemptCount + 1,
    startedAt: progress.startedAt ?? updatedAt,
    updatedAt,
  };
}

function applyCycleAdvance(progress: BookProgressSnapshot): BookProgressSnapshot {
  return {
    ...progress,
    cycle: Math.min(progress.cycle + 1, 7),
    position: 1,
    solved: [],
    missed: [],
    solvedCount: 0,
    missedCount: 0,
    unresolvedMissedCount: 0,
    attemptCount: progress.attemptCount,
    startedAt: null,
    updatedAt: Date.now(),
  };
}

function localSnapshot(book: BookTrainingKey | null, fullBookSize: number) {
  return book ? readLocalBookProgressSnapshot(book, fullBookSize) : null;
}

export function useBookProgress(book: BookTrainingKey | null, fullBookSize: number) {
  const serverProgress = useQuery(
    api.bookProgress.getBookProgress,
    book ? { bookKey: book } : 'skip',
  ) as BookProgressSnapshot | null | undefined;
  const recordServerAttempt = useMutation(api.bookProgress.recordAttempt);
  const advanceServerCycle = useMutation(api.bookProgress.advanceCycle);
  const migrateLocalProgress = useMutation(api.bookProgress.migrateLocalProgress);
  // Keep the server and browser's first render identical. localStorage is
  // loaded after hydration and is only used once Convex has confirmed that no
  // server snapshot exists.
  const [localProgress, setLocalProgress] = useState<BookProgressSnapshot | null>(null);
  const [optimisticProgress, setOptimisticProgress] = useState<BookProgressSnapshot | null>(null);
  const migrationKeyRef = useRef<string | null>(null);
  const flushingRef = useRef(false);

  useEffect(() => {
    if (!book) return;
    const refresh = () => setLocalProgress(localSnapshot(book, fullBookSize));
    refresh();
    const eventName = getBookProgressEventName();
    window.addEventListener(eventName, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(eventName, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [book, fullBookSize]);

  const optimisticFitsServerSet = Boolean(
    optimisticProgress
    && serverProgress
    && optimisticProgress.setSize === serverProgress.setSize
    && optimisticProgress.position <= serverProgress.setSize + 1
    && optimisticProgress.solved.every((puzzle) => puzzle <= serverProgress.setSize)
    && optimisticProgress.missed.every((puzzle) => puzzle <= serverProgress.setSize),
  );
  const optimisticIsAhead = Boolean(
    optimisticFitsServerSet
    && optimisticProgress
    && serverProgress
    && (
      optimisticProgress.cycle > serverProgress.cycle
      || optimisticProgress.attemptCount > serverProgress.attemptCount
    ),
  );
  const localRecovery = isLocalBookProgressSnapshot(localProgress) ? localProgress : null;
  const optimisticRecovery = serverProgress === null
    ? (isLocalBookProgressSnapshot(optimisticProgress) ? optimisticProgress : null)
    : optimisticProgress;
  const progress = serverProgress === undefined
    ? null
    : serverProgress === null
      ? optimisticRecovery ?? localRecovery
      : optimisticIsAhead
        ? optimisticProgress
        : serverProgress;

  const rememberSnapshot = useCallback((snapshot: BookProgressSnapshot) => {
    cacheBookProgressSnapshot(snapshot);
    setOptimisticProgress(snapshot);
  }, []);

  useEffect(() => {
    if (serverProgress) cacheBookProgressSnapshot(serverProgress);
  }, [serverProgress]);

  const migrateSnapshot = async (snapshot: BookProgressSnapshot) => {
    if (!book || !hasLocalBookProgress(snapshot)) return null;
    const idempotencyKey = localMigrationKey(snapshot);
    const migration = await migrateLocalProgress({
      bookKey: book,
      idempotencyKey,
      progress: {
        cycle: snapshot.cycle,
        position: snapshot.position,
        setSize: snapshot.setSize,
        solved: snapshot.solved,
        missed: snapshot.missed,
        ...(snapshot.startedAt === null ? {} : { startedAt: snapshot.startedAt }),
      },
    });
    if (migration.snapshot) rememberSnapshot(migration.snapshot as BookProgressSnapshot);
    return migration.snapshot as BookProgressSnapshot | null;
  };

  useEffect(() => {
    if (!book || serverProgress !== null || !localProgress || !hasLocalBookProgress(localProgress)) return;
    const idempotencyKey = localMigrationKey(localProgress);
    if (migrationKeyRef.current === idempotencyKey) return;
    migrationKeyRef.current = idempotencyKey;
    void migrateSnapshot(localProgress).catch(() => {
      // Keep rendering the local recovery copy. A later mount or local change
      // safely retries with the same idempotency key.
      migrationKeyRef.current = null;
    });
  // migrateSnapshot intentionally closes over the current mutation handle;
  // rerunning this effect is controlled by the deterministic key above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, localProgress, serverProgress]);

  useEffect(() => {
    if (!book || !serverProgress || flushingRef.current) return;
    const pending = readPendingAttempts(book);
    if (pending.length === 0) return;
    flushingRef.current = true;
    void (async () => {
      try {
        for (const attempt of pending) {
          if (attempt.puzzle > serverProgress.setSize) {
            removePendingAttempt(book, attempt.attemptId);
            continue;
          }
          const snapshot = await recordServerAttempt({
            bookKey: book,
            puzzle: attempt.puzzle,
            success: attempt.success,
            attemptId: attempt.attemptId,
            ...(attempt.durationMs === undefined ? {} : { durationMs: attempt.durationMs }),
          });
          removePendingAttempt(book, attempt.attemptId);
          rememberSnapshot(snapshot as BookProgressSnapshot);
        }
      } catch {
        // Leave the remaining attempts in localStorage for the next retry.
      } finally {
        flushingRef.current = false;
      }
    })();
  }, [book, recordServerAttempt, rememberSnapshot, serverProgress]);

  const recordAttempt = (puzzle: number, success: boolean, durationMs?: number) => {
    if (!book || !progress) return;
    // Imported legacy progress can represent a bounded track (Easy = 222)
    // inside a larger book. Never let an out-of-set direct URL create an
    // optimistic result that the server must reject and retry forever.
    if (!Number.isInteger(puzzle) || puzzle < 1 || puzzle > progress.setSize) return;
    const baseProgress = progress;
    const attemptId = newAttemptId(book, puzzle);
    const boundedDurationMs = durationMs === undefined
      ? undefined
      : Math.min(86_400_000, Math.max(0, Math.round(durationMs)));
    const pendingAttempt = { attemptId, puzzle, success, durationMs: boundedDurationMs };

    if (success) {
      recordBookPuzzleSolved(book, puzzle);
      if (isBookMethodEnabled(book) && puzzle <= BOOK_METHODS[book].recommendedSetSize) {
        recordBookMethodSolve(book, puzzle);
      }
    } else {
      recordBookPuzzleMissed(book, puzzle);
    }
    setLocalProgress(localSnapshot(book, fullBookSize));
    const optimistic = applyAttempt(optimisticProgress ?? baseProgress, puzzle, success);
    rememberSnapshot(optimistic);
    queuePendingAttempt(book, pendingAttempt);

    void (async () => {
      try {
        if (serverProgress === null && hasLocalBookProgress(baseProgress)) {
          await migrateSnapshot(baseProgress);
        }
        const snapshot = await recordServerAttempt({
          bookKey: book,
          puzzle,
          success,
          attemptId,
          ...(boundedDurationMs === undefined ? {} : { durationMs: boundedDurationMs }),
        });
        removePendingAttempt(book, attemptId);
        rememberSnapshot(snapshot as BookProgressSnapshot);
      } catch {
        // The optimistic/local result remains usable and the queued attempt is
        // retried after a server snapshot is available again.
      }
    })();
  };

  const advanceCycle = () => {
    if (!book || !progress || progress.cycle >= 7) return;
    const baseProgress = progress;
    startNextBookMethodCycle(book);
    setLocalProgress(localSnapshot(book, fullBookSize));
    rememberSnapshot(applyCycleAdvance(baseProgress));
    void (async () => {
      try {
        if (serverProgress === null && hasLocalBookProgress(baseProgress)) {
          await migrateSnapshot(baseProgress);
        }
        const snapshot = await advanceServerCycle({
          bookKey: book,
          expectedCycle: baseProgress.cycle,
        });
        rememberSnapshot(snapshot as BookProgressSnapshot);
      } catch {
        // Local author-method state remains as the offline fallback.
      }
    })();
  };

  return {
    progress,
    isLoading: serverProgress === undefined || (serverProgress === null && localProgress === null),
    isServerBacked: serverProgress !== undefined && serverProgress !== null,
    recordAttempt,
    advanceCycle,
  };
}
