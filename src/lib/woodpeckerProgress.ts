import {
  BOOK_METHODS,
  hasStoredBookMethodProgress,
  readBookMethodProgress,
  type BookTrainingKey,
} from './bookTrainingPreferences';

/**
 * Puzzle progress is intentionally kept in the browser for the bundled book
 * courses.  Keep the original `woodpecker` key as an alias: early versions of
 * the trainer wrote there, while newer routes use the full course key.
 */
const aliases: Record<BookTrainingKey, { solved: string[]; missed: string[] }> = {
  'woodpecker-method': {
    solved: ['repdrill:woodpecker:solved', 'repdrill:woodpecker-method:solved'],
    missed: ['repdrill:woodpecker:missed', 'repdrill:woodpecker-method:missed'],
  },
  'woodpecker-method-2': {
    solved: ['repdrill:woodpecker-method-2:solved'],
    missed: ['repdrill:woodpecker-method-2:missed'],
  },
};

const snapshotKey = (book: BookTrainingKey) => `repdrill:${book}:progress-snapshot-v1`;
const LOCAL_STORAGE_SOURCE_MARKER = 'repdrill-local-storage';

export type BookPuzzleProgress = {
  solved: number[];
  missed: number[];
};

export type BookProgressSnapshot = BookPuzzleProgress & {
  bookKey: BookTrainingKey;
  cycle: number;
  position: number;
  setSize: number;
  solvedCount: number;
  missedCount: number;
  unresolvedMissedCount: number;
  attemptCount: number;
  startedAt: number | null;
  updatedAt: number;
  sourceMarker: string | null;
};

function readCachedSnapshot(book: BookTrainingKey): BookProgressSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(snapshotKey(book)) ?? 'null');
    if (
      !parsed
      || parsed.bookKey !== book
      || !Array.isArray(parsed.solved)
      || !Array.isArray(parsed.missed)
      || !Number.isInteger(parsed.cycle)
      || !Number.isInteger(parsed.position)
      || !Number.isInteger(parsed.setSize)
      || !Number.isInteger(parsed.solvedCount)
      || !Number.isInteger(parsed.missedCount)
      || !Number.isInteger(parsed.unresolvedMissedCount)
      || !Number.isInteger(parsed.attemptCount)
      || !Number.isFinite(parsed.updatedAt)
    ) return null;
    return parsed as BookProgressSnapshot;
  } catch {
    return null;
  }
}

export function cacheBookProgressSnapshot(progress: BookProgressSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(snapshotKey(progress.bookKey), JSON.stringify(progress));
  } catch {
    // Realtime Convex state still works when browser storage is unavailable.
  }
}

function readNumbers(keys: string[]) {
  if (typeof window === 'undefined') return new Set<number>();
  const result = new Set<number>();
  for (const key of keys) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]');
      if (Array.isArray(parsed)) {
        for (const value of parsed) {
          const number = Number(value);
          if (Number.isInteger(number) && number > 0) result.add(number);
        }
      }
    } catch {
      // A malformed local value should not prevent the course from loading.
    }
  }
  return result;
}

function writeNumbers(key: string, values: Set<number>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify([...values].sort((a, b) => a - b)));
  } catch {
    // Realtime Convex state still works when browser storage is unavailable.
  }
}

function emitProgress(book: BookTrainingKey) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('repdrill:book-progress-change', { detail: { book } }));
  }
}

export function readBookPuzzleProgress(book: BookTrainingKey): BookPuzzleProgress {
  const keys = aliases[book];
  const solved = readNumbers(keys.solved);
  const missed = readNumbers(keys.missed);
  // A solved puzzle cannot remain in the missed queue after a later successful
  // attempt, even when it was recorded by an older version of the app.
  for (const exercise of solved) missed.delete(exercise);
  return {
    solved: [...solved].sort((a, b) => a - b),
    missed: [...missed].sort((a, b) => a - b),
  };
}

/**
 * Build the best current-cycle snapshot available before Convex responds.
 * Older RepDrill versions split lifetime puzzle state and author-cycle state
 * across three localStorage records, so prefer the cycle-specific solved list
 * whenever that record exists.
 */
export function readLocalBookProgressSnapshot(
  book: BookTrainingKey,
  fullBookSize: number = BOOK_METHODS[book].recommendedSetSize,
): BookProgressSnapshot {
  const cached = readCachedSnapshot(book);
  if (cached) return cached;
  const puzzleProgress = readBookPuzzleProgress(book);
  const methodProgress = readBookMethodProgress(book);
  const hasMethodProgress = hasStoredBookMethodProgress(book);
  const setSize = hasMethodProgress ? BOOK_METHODS[book].recommendedSetSize : fullBookSize;
  const solved = [...new Set(hasMethodProgress ? methodProgress.solved : puzzleProgress.solved)]
    .filter((exercise) => Number.isInteger(exercise) && exercise > 0 && exercise <= setSize)
    .sort((a, b) => a - b);
  const solvedSet = new Set(solved);
  const missed = [...new Set(puzzleProgress.missed)]
    .filter((exercise) => exercise <= setSize && !solvedSet.has(exercise))
    .sort((a, b) => a - b);
  const nextPosition = solved.length > 0
    ? Math.max(...solved) + 1
    : missed[0] ?? 1;
  const startedAt = Date.parse(methodProgress.startedAt);

  return {
    bookKey: book,
    cycle: hasMethodProgress ? methodProgress.cycle : 1,
    position: Math.min(setSize + 1, nextPosition),
    setSize,
    solved,
    missed,
    solvedCount: solved.length,
    missedCount: missed.length,
    unresolvedMissedCount: 0,
    // Legacy localStorage only retained aggregate sets, not attempt history.
    attemptCount: 0,
    startedAt: Number.isFinite(startedAt) ? startedAt : null,
    updatedAt: 0,
    sourceMarker: LOCAL_STORAGE_SOURCE_MARKER,
  };
}

export function hasLocalBookProgress(snapshot: BookProgressSnapshot) {
  return isLocalBookProgressSnapshot(snapshot)
    && (snapshot.cycle > 1
    || snapshot.position > 1
    || snapshot.solvedCount > 0
    || snapshot.missedCount > 0);
}

/**
 * Only this marker denotes an unscoped browser recovery copy.  Snapshots with
 * any other marker came from a server account and must not be shown or
 * migrated when the current account has no matching server row.
 */
export function isLocalBookProgressSnapshot(
  snapshot: BookProgressSnapshot | null | undefined,
) {
  return snapshot?.sourceMarker === LOCAL_STORAGE_SOURCE_MARKER;
}

export function recordBookPuzzleSolved(book: BookTrainingKey, exercise: number) {
  const keys = aliases[book];
  const solved = readNumbers(keys.solved);
  solved.add(exercise);
  writeNumbers(keys.solved[0], solved);
  const missed = readNumbers(keys.missed);
  missed.delete(exercise);
  writeNumbers(keys.missed[0], missed);
  emitProgress(book);
  return readBookPuzzleProgress(book);
}

export function recordBookPuzzleMissed(book: BookTrainingKey, exercise: number) {
  const progress = readBookPuzzleProgress(book);
  if (progress.solved.includes(exercise)) return progress;
  const missed = new Set(progress.missed);
  missed.add(exercise);
  writeNumbers(aliases[book].missed[0], missed);
  emitProgress(book);
  return readBookPuzzleProgress(book);
}

export function clearBookPuzzleMissed(book: BookTrainingKey, exercise: number) {
  const missed = readNumbers(aliases[book].missed);
  missed.delete(exercise);
  writeNumbers(aliases[book].missed[0], missed);
  emitProgress(book);
  return readBookPuzzleProgress(book);
}

export function getBookProgressEventName() {
  return 'repdrill:book-progress-change';
}
