'use client';

export async function submitLineRatings(
  results: { cardId: string; correct: boolean; responseTimeMs: number }[],
) {
  try {
    const response = await fetch('/api/backend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operation: 'training.submitLineRatings', args: { results } }),
    });
    if (!response.ok) throw new Error(`Rating submission failed (${response.status})`);
  } catch (error) {
    console.error('Failed to submit line ratings:', error);
  }
}
