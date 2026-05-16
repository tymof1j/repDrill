'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@convex/_generated/api';
import {
  AppSurface,
  EmptyState,
  PageHeader,
  PremiumButton,
  SecondaryButton,
  StatTile,
} from '@/components/ui/Premium';
import { TrainingSession } from './TrainingSession';
import type { Id } from '@convex/_generated/dataModel';

type Selection =
  | { type: 'all' }
  | { type: 'repertoire'; id: Id<'repertoires'> }
  | { type: 'course'; id: Id<'courses'> };

export default function TrainPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from') ?? undefined;

  const [cardsReady, setCardsReady] = useState(false);
  const [selection, setSelection] = useState<Selection>({ type: 'all' });
  const ensureCards = useMutation(api.training.ensureCards);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    ensureCards({})
      .then(() => setCardsReady(true))
      .catch(() => setCardsReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  const courses = useQuery(api.courses.list);
  const repertoires = useQuery(api.repertoires.list);

  const onlyCourse = courses?.length === 1 ? courses[0]._id : undefined;

  const queryArgs = cardsReady && courses !== undefined && repertoires !== undefined
    ? {
        fromPositionId: fromParam as Id<'positions'> | undefined,
        courseId:
          selection.type === 'course'
            ? selection.id
            : onlyCourse && selection.type === 'all'
              ? onlyCourse
              : undefined,
        repertoireId:
          selection.type === 'repertoire' ? selection.id : undefined,
      }
    : 'skip' as const;

  const result = useQuery(api.training.getTrainingLines, queryArgs);

  if (!isAuthenticated || !cardsReady || result === undefined || courses === undefined || repertoires === undefined) return null;

  const showSelector = courses.length > 1 || repertoires.length > 0;

  const filterBar = showSelector ? (
    <div className="mb-6 flex flex-wrap items-center gap-x-1 gap-y-1 border-b border-[color:var(--paper-edge)] pb-3">
      <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        Filter
      </span>
      <button
        type="button"
        onClick={() => setSelection({ type: 'all' })}
        className={`rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-150 ${
          selection.type === 'all'
            ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
            : 'text-[color:var(--ink-soft)] hover:bg-[color:var(--paper-deep)]'
        }`}
      >
        All lines
      </button>
      {repertoires.map((r) => (
        <button
          key={r._id}
          type="button"
          onClick={() => setSelection({ type: 'repertoire', id: r._id })}
          className={`rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-150 ${
            selection.type === 'repertoire' && selection.id === r._id
              ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
              : 'text-[color:var(--ink-soft)] hover:bg-[color:var(--paper-deep)]'
          }`}
        >
          {r.name}
        </button>
      ))}
      {courses.length > 1 && courses.map((c) => (
        <button
          key={c._id}
          type="button"
          onClick={() => setSelection({ type: 'course', id: c._id })}
          className={`rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-150 ${
            selection.type === 'course' && selection.id === c._id
              ? 'bg-[color:var(--ink)] text-[color:var(--paper)]'
              : 'text-[color:var(--ink-soft)] hover:bg-[color:var(--paper-deep)]'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  ) : null;

  if (result.lines.length === 0) {
    return (
      <AppSurface>
        {filterBar}
        <PageHeader
          eyebrow="Part III — Training"
          title="The queue is quiet."
          body="Nothing is due right now. The scheduler will surface lines when memory has had time to fade."
          action={<SecondaryButton href="/courses">Back to library</SecondaryButton>}
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

  return <TrainingSession initialLines={result.lines} filterBar={filterBar} />;
}
