export type ReviewEvent = {
  id: string;
  kind: 'review';
  cardId: string;
  correct: boolean;
  responseTimeMs: number;
  reviewedAt: number;
};

export type InfoEvent = {
  id: string;
  kind: 'info';
  chapterId: string;
  lineKey: string;
  reviewedAt: number;
};

export type PuzzleEvent = Omit<InfoEvent, 'kind'> & { kind: 'puzzle'; correct: boolean };
export type ProgressEvent = ReviewEvent | InfoEvent | PuzzleEvent;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateProgressEvents(value: unknown): ProgressEvent[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new Error('Expected 1–100 progress events');
  }
  const ids = new Set<string>();
  for (const event of value) {
    if (!event || !uuid.test(event.id) || ids.has(event.id) ||
        !Number.isFinite(event.reviewedAt) || event.reviewedAt < 0 || event.reviewedAt > 8_640_000_000_000_000) {
      throw new Error('Invalid progress event');
    }
    ids.add(event.id);
    if (event.kind === 'review') {
      if (!uuid.test(event.cardId) || typeof event.correct !== 'boolean' ||
          !Number.isInteger(event.responseTimeMs) || event.responseTimeMs < 0 || event.responseTimeMs > 86_400_000) {
        throw new Error('Invalid review result');
      }
    } else if (event.kind === 'info' || event.kind === 'puzzle') {
      if (!uuid.test(event.chapterId) || typeof event.lineKey !== 'string' ||
          !event.lineKey.trim() || event.lineKey.length > 20_000) throw new Error('Invalid viewed line');
      if (event.kind === 'puzzle' && typeof event.correct !== 'boolean') throw new Error('Invalid puzzle result');
    } else throw new Error('Unknown progress event');
  }
  return value;
}
