import type { BookTrainingKey } from './bookTrainingPreferences';

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

export type BookPuzzleProgress = {
  solved: number[];
  missed: number[];
};

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
  window.localStorage.setItem(key, JSON.stringify([...values].sort((a, b) => a - b)));
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
