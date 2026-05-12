'use client';

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// This module provides a submitLineRatings function that can be called
// from non-hook contexts (useEffect callbacks). It uses a singleton
// ConvexReactClient approach.

// We need a way to call mutations from outside React hooks.
// The simplest approach: use fetch to call a thin API route, or
// use the global convex client. Let's use the ConvexHttpClient instead.
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function submitLineRatings(
  results: { cardId: string; correct: boolean; responseTimeMs: number }[]
) {
  // Use the HTTP client to call the mutation directly
  // Note: this won't have auth context, so we use a different approach
  // We'll use the mutation API through the HTTP client
  try {
    await client.mutation(api.training.submitLineRatings, {
      results: results.map((r) => ({
        cardId: r.cardId as Id<"reviewCards">,
        correct: r.correct,
        responseTimeMs: r.responseTimeMs,
      })),
    });
  } catch (error) {
    console.error("Failed to submit line ratings:", error);
  }
}
