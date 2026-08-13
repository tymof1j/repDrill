export type PendingLineSave = {
  saveId: string;
  courseId: string;
  results: Array<{
    cardId: string;
    correct: boolean;
    responseTimeMs: number;
  }>;
  infoLines: Array<{
    chapterId: string;
    lineKey: string;
  }>;
};

const STORAGE_KEY = 'repdrill:pending-training-saves:v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readRawQueue(): PendingLineSave[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingLineSave => (
      item && typeof item.saveId === 'string' && typeof item.courseId === 'string'
      && Array.isArray(item.results) && Array.isArray(item.infoLines)
    ));
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingLineSave[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Private browsing or a full storage quota should not stop training.
  }
}

export function readPendingLineSaves() {
  return readRawQueue();
}

export function enqueuePendingLineSave(save: PendingLineSave) {
  const queue = readRawQueue();
  const existingIndex = queue.findIndex((item) => item.saveId === save.saveId);
  if (existingIndex >= 0) queue[existingIndex] = save;
  else queue.push(save);
  writeQueue(queue);
  return queue.length;
}

export function removePendingLineSave(saveId: string) {
  const queue = readRawQueue().filter((item) => item.saveId !== saveId);
  writeQueue(queue);
  return queue.length;
}

export function createTrainingSaveId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `training-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
