import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { redirect } from 'next/navigation';
import { AppSurface, EmptyState, PageHeader, PremiumButton, SecondaryButton, StatTile } from '@/components/ui/Premium';
import { TrainingSession } from './TrainingSession';
import type { Id } from "@convex/_generated/dataModel";

export default async function TrainPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const token = await convexAuthNextjsToken();
  if (!token) redirect('/login');

  const params = await searchParams;

  // Ensure review cards exist before fetching lines
  await fetchMutation(api.training.ensureCards, {}, { token });

  const result = await fetchQuery(
    api.training.getTrainingLines,
    {
      fromPositionId: params.from as Id<"positions"> | undefined,
    },
    { token }
  );

  if (result.lines.length === 0) {
    return (
      <AppSurface>
        <PageHeader
          eyebrow="Part III — Training"
          title="The queue is quiet."
          body="Nothing is due right now. The scheduler will surface lines when memory has had time to fade."
          action={
            <SecondaryButton href="/courses">Back to library</SecondaryButton>
          }
        />

        <div className="mb-12 grid grid-cols-3 gap-x-2 gap-y-6 border-y border-[color:var(--paper-edge)] py-8">
          <StatTile label="Total lines" value={result.totalLines} hint="across all courses" />
          <StatTile label="Due" value={result.dueLines} tone="red" hint="awaiting recall" />
          <StatTile label="New" value={result.newLines} tone="gold" hint="never seen" />
        </div>

        {result.totalLines === 0 ? (
          <EmptyState>
            Import a PGN into a course to begin generating review lines. RepDrill will then
            schedule each one against the curve of forgetting.
          </EmptyState>
        ) : (
          <div className="border border-dashed border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-8 py-12 text-center">
            <p className="font-display-italic text-lg leading-relaxed text-[color:var(--ink-soft)]">
              Come back when the schedule asks for recall — or import more theory now.
            </p>
            <PremiumButton href="/courses" className="mt-5">
              Open library
            </PremiumButton>
          </div>
        )}
      </AppSurface>
    );
  }

  return <TrainingSession initialLines={result.lines} />;
}
