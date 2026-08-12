import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/workos/server';
import {
  getWoodpecker2Puzzle,
  woodpecker2Puzzles,
} from '@/lib/woodpecker2';
import { WoodpeckerTrainer } from '../woodpecker/WoodpeckerTrainer';

export default async function Woodpecker2TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  if (!(await isAuthenticated())) redirect('/login');
  const query = await searchParams;
  const requested = Number.parseInt(query.n ?? '1', 10);
  const number = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), woodpecker2Puzzles.length)
    : 1;
  const puzzle = getWoodpecker2Puzzle(number) ?? woodpecker2Puzzles[0];

  return (
    <WoodpeckerTrainer
      key={puzzle.exercise}
      puzzle={puzzle}
      total={woodpecker2Puzzles.length}
      courseKey="woodpecker-method-2"
      courseSlug="woodpecker-2"
    />
  );
}
