export type BookTrainingKey = 'woodpecker-method' | 'woodpecker-method-2';
export type LearnQuizPasses = 1 | 2 | 3;

export type BookMethodProgress = {
  cycle: number;
  solved: number[];
  startedAt: string;
};

export const BOOK_METHODS = {
  'woodpecker-method': {
    title: 'The Woodpecker Method',
    recommendedSetSize: 250,
    targetDays: [28, 14, 7, 4, 2, 1, 1],
    kind: 'tactical',
  },
  'woodpecker-method-2': {
    title: 'The Woodpecker Method 2',
    recommendedSetSize: 296,
    targetDays: [28, 14, 7, 4, 2, 1, 1],
    kind: 'positional',
  },
} as const;

const enabledKey = (book: BookTrainingKey) => `repdrill:${book}:author-method`;
const progressKey = (book: BookTrainingKey) => `repdrill:${book}:method-progress`;
const learnQuizPassesKey = 'repdrill:learn-quiz-passes';
const learnResumeKey = (courseId: string) => `repdrill:learn-resume:${courseId}`;

function emitBookProgress(book: BookTrainingKey) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('repdrill:book-progress-change', { detail: { book } }));
}

export function isBookMethodEnabled(book: BookTrainingKey) {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(enabledKey(book)) !== 'off';
  } catch {
    return true;
  }
}

export function setBookMethodEnabled(book: BookTrainingKey, enabled: boolean) {
  window.localStorage.setItem(enabledKey(book), enabled ? 'on' : 'off');
  window.dispatchEvent(new CustomEvent('repdrill:book-method-change', { detail: { book } }));
}

export function readBookMethodProgress(book: BookTrainingKey): BookMethodProgress {
  const fallback = {
    cycle: 1,
    solved: [],
    startedAt: new Date().toISOString(),
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(progressKey(book)) ?? 'null');
    if (!parsed || !Array.isArray(parsed.solved)) return fallback;
    return {
      cycle: Math.min(Math.max(Number(parsed.cycle) || 1, 1), 7),
      solved: parsed.solved.filter(Number.isFinite),
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : fallback.startedAt,
    };
  } catch {
    return fallback;
  }
}

export function hasStoredBookMethodProgress(book: BookTrainingKey) {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(progressKey(book)) !== null;
  } catch {
    return false;
  }
}

export function recordBookMethodSolve(book: BookTrainingKey, exercise: number) {
  const progress = readBookMethodProgress(book);
  if (!progress.solved.includes(exercise)) progress.solved.push(exercise);
  try {
    window.localStorage.setItem(progressKey(book), JSON.stringify(progress));
  } catch {
    // Convex remains the primary store when browser storage is unavailable.
  }
  emitBookProgress(book);
  return progress;
}

export function startNextBookMethodCycle(book: BookTrainingKey) {
  const progress = readBookMethodProgress(book);
  const next = {
    cycle: Math.min(progress.cycle + 1, 7),
    solved: [],
    startedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(progressKey(book), JSON.stringify(next));
  } catch {
    // Convex remains the primary store when browser storage is unavailable.
  }
  emitBookProgress(book);
  return next;
}

export function readLearnQuizPasses(): LearnQuizPasses {
  if (typeof window === 'undefined') return 1;
  const value = Number(window.localStorage.getItem(learnQuizPassesKey));
  return value === 2 || value === 3 ? value : 1;
}

export function setLearnQuizPasses(value: LearnQuizPasses) {
  window.localStorage.setItem(learnQuizPassesKey, String(value));
  window.dispatchEvent(new CustomEvent('repdrill:learn-quiz-passes', { detail: { value } }));
}

export function readLearnResume(courseId: string): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(learnResumeKey(courseId));
  return value?.trim() || null;
}

export function recordLearnResume(courseId: string, lineId: string | null) {
  if (typeof window === 'undefined') return;
  if (lineId) window.localStorage.setItem(learnResumeKey(courseId), lineId);
  else window.localStorage.removeItem(learnResumeKey(courseId));
}
