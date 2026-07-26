import dataset from '@/data/woodpecker-method-2.json';

export type Woodpecker2Puzzle = {
  exercise: number;
  part: 'priyome' | 'rules-of-thumb';
  section: 'public-education' | 'exam' | 'academic' | 'medium' | 'hard' | 'expert';
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

export const WOODPECKER_2_COURSE = {
  key: 'woodpecker-method-2',
  name: 'The Woodpecker Method 2',
  author: 'Axel Smith',
  description:
    'A complete positional workout: 1,000 positions on priyomes and rules of thumb, paired with the author’s plans and explanations.',
  total: 1000,
} as const;

export const woodpecker2Puzzles = dataset as Woodpecker2Puzzle[];

export function getWoodpecker2Puzzle(exercise: number) {
  return woodpecker2Puzzles.find((puzzle) => puzzle.exercise === exercise) ?? null;
}

export function getWoodpecker2SectionRange(section: Woodpecker2Puzzle['section']) {
  const puzzles = woodpecker2Puzzles.filter((puzzle) => puzzle.section === section);
  return {
    first: puzzles[0]?.exercise ?? 1,
    last: puzzles.at(-1)?.exercise ?? 1,
    count: puzzles.length,
  };
}

