import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/workos/server';
import { getWoodpeckerPuzzle, woodpeckerPuzzles } from '@/lib/woodpecker';
import { WoodpeckerTrainer } from './WoodpeckerTrainer';

export default async function WoodpeckerTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  if (!(await isAuthenticated())) redirect('/login');
  const query = await searchParams;
  const requested = Number.parseInt(query.n ?? '1', 10);
  const number = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), woodpeckerPuzzles.length)
    : 1;
  const puzzle = getWoodpeckerPuzzle(number) ?? woodpeckerPuzzles[0];

  return (
    <WoodpeckerTrainer
      key={puzzle.exercise}
      puzzle={puzzle}
      total={woodpeckerPuzzles.length}
      sourcePdfAvailable={Boolean(process.env.WOODPECKER_SOURCE_PDF_URL)}
    />
  );
}
