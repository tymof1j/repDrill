'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { applyRating, getTrainingStats } from '@/lib/srs/queries';
import { getTrainingLines } from '@/lib/srs/lines';
import { Rating, type Grade } from '@/lib/srs/fsrs';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user.id;
}

export async function loadTrainingLines(opts?: { courseId?: string; fromPositionId?: string }) {
  const userId = await requireUserId();
  return getTrainingLines(userId, {
    courseId: opts?.courseId,
    fromPositionId: opts?.fromPositionId,
  });
}

export async function submitRating(
  cardId: string,
  rating: number,
  responseTimeMs: number,
) {
  const userId = await requireUserId();
  await applyRating(userId, cardId, rating as Grade, responseTimeMs);
}

export async function submitLineRatings(
  results: { cardId: string; correct: boolean; responseTimeMs: number }[],
) {
  const userId = await requireUserId();
  for (const r of results) {
    const rating: Grade = r.correct ? Rating.Good : Rating.Again;
    await applyRating(userId, r.cardId, rating, r.responseTimeMs);
  }
}

export async function fetchTrainingStats() {
  const userId = await requireUserId();
  return getTrainingStats(userId);
}
