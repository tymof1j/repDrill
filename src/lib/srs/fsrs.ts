import {
  fsrs,
  createEmptyCard,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
  type RecordLogItem,
  type FSRS,
} from 'ts-fsrs';

export { Rating };
export type { Card, Grade, RecordLogItem };

const params = generatorParameters({ enable_fuzz: true });
const f: FSRS = fsrs(params);

export function newCard(): Card {
  return createEmptyCard();
}

export function scheduleCard(card: Card, rating: Grade, now?: Date): RecordLogItem {
  return f.next(card, now ?? new Date(), rating);
}

export function suggestRating(responseTimeMs: number): Grade {
  if (responseTimeMs < 3000) return Rating.Easy;
  if (responseTimeMs < 8000) return Rating.Good;
  if (responseTimeMs < 15000) return Rating.Hard;
  return Rating.Again;
}

export const RATING_LABELS: Record<number, string> = {
  [Rating.Again]: 'Again',
  [Rating.Hard]: 'Hard',
  [Rating.Good]: 'Good',
  [Rating.Easy]: 'Easy',
};

export const RATING_HOTKEYS: Record<string, Grade> = {
  '1': Rating.Again,
  '2': Rating.Hard,
  '3': Rating.Good,
  '4': Rating.Easy,
};
