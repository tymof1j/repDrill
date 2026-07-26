import dataset from '@/data/woodpecker-method.json';

export type WoodpeckerPuzzle = {
  exercise: number;
  section: 'easy' | 'intermediate' | 'advanced';
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
  pdfPage: number;
};

export const WOODPECKER_COURSE = {
  key: 'woodpecker-method',
  name: 'The Woodpecker Method',
  author: 'Axel Smith & Hans Tikkanen',
  description:
    'A complete tactical workout from the book: solve the position first, then compare your line with the authors’ explanation.',
  total: 1128,
} as const;

export const woodpeckerPuzzles = dataset as WoodpeckerPuzzle[];

export function getWoodpeckerPuzzle(exercise: number) {
  return woodpeckerPuzzles.find((puzzle) => puzzle.exercise === exercise) ?? null;
}

export function getSectionRange(section: WoodpeckerPuzzle['section']) {
  const puzzles = woodpeckerPuzzles.filter((puzzle) => puzzle.section === section);
  return {
    first: puzzles[0]?.exercise ?? 1,
    last: puzzles.at(-1)?.exercise ?? 1,
    count: puzzles.length,
  };
}
