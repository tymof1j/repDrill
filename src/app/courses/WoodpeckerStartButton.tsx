'use client';

import { useRouter } from 'next/navigation';
import { PremiumButton } from '@/components/ui/Premium';
import { useBookProgress } from '@/lib/hooks/useBookProgress';
import type { BookTrainingKey } from '@/lib/bookTrainingPreferences';

type Props = {
  bookKey: BookTrainingKey;
  courseSlug: string;
  total: number;
  label: string;
};

/**
 * Resolve the first puzzle that is not solved in the current server-backed
 * track. Keeping this decision client-side means the course CTA can use the
 * authenticated Convex snapshot instead of guessing from a bundled dataset.
 */
export function WoodpeckerStartButton({ bookKey, courseSlug, total, label }: Props) {
  const router = useRouter();
  const { progress, isLoading } = useBookProgress(bookKey, total);

  const firstUnsolved = progress ? findFirstUnsolved(progress.solved, progress.setSize, total) : null;
  const disabled = isLoading || firstUnsolved === null;

  return (
    <PremiumButton
      disabled={disabled}
      onClick={() => {
        if (firstUnsolved !== null) router.push(`/train/puzzles/${courseSlug}?n=${firstUnsolved}`);
      }}
    >
      {isLoading ? 'Loading progress…' : label}
    </PremiumButton>
  );
}

function findFirstUnsolved(solved: number[], setSize: number, total: number) {
  const limit = Math.min(Math.max(setSize, 1), total);
  const solvedSet = new Set(solved);
  for (let exercise = 1; exercise <= limit; exercise += 1) {
    if (!solvedSet.has(exercise)) return exercise;
  }
  return null;
}
