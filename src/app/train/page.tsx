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
import { readLearnResume } from '@/lib/bookTrainingPreferences';

type Selection =
  | { type: 'all' }
  | { type: 'repertoire'; id: Id<'repertoires'> }
  | { type: 'course'; id: Id<'courses'> };

export default function TrainPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from') ?? undefined;
  const courseParam = searchParams.get('courseId') ?? undefined;
  const chapterParam = searchParams.get('chapterId') ?? undefined;
  const learnMode = searchParams.get('mode') === 'learn';

  const [cardsReady, setCardsReady] = useState(false);
  const resumeLineId = learnMode && courseParam && !chapterParam
    ? readLearnResume(courseParam)
    : null;
  const [selection, setSelection] = useState<Selection>(() =>
    courseParam
      ? { type: 'course', id: courseParam as Id<'courses'> }
      : { type: 'all' },
  );
  const ensureCards = useMutation(api.training.ensureCards);

  // Keep deep links (and client-side navigation between course cards) in sync
  // with the selector.  This runs only when the URL parameter changes, so a
  // user can still switch filters locally while staying on the same URL.
  useEffect(() => {
    // The URL is an external source of truth; reset the local filter only when
    // that source changes (not on every render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection(courseParam ? { type: 'course', id: courseParam as Id<'courses'> } : { type: 'all' });
  }, [courseParam]);

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
        chapterId: chapterParam as Id<'chapters'> | undefined,
        learnMode,
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
    <details className="relative mb-4 lg:fixed lg:right-5 lg:top-5 lg:z-30 lg:mb-0">
      <summary className="ml-auto flex w-fit cursor-pointer list-none items-center gap-2 rounded border border-[color:var(--paper-edge)] bg-[color:var(--surface)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)] shadow-[0_8px_20px_rgba(47,58,50,0.08)] marker:content-none [&::-webkit-details-marker]:hidden">
        Filter
        <span aria-hidden>⌄</span>
      </summary>
      <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 rounded border border-[color:var(--paper-edge)] bg-[color:var(--surface)] p-2 shadow-[0_18px_45px_rgba(47,58,50,0.12)] lg:absolute lg:right-0 lg:w-80">
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
    </details>
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

  const sessionKey = selection.type === 'course'
    ? `course:${selection.id}`
    : selection.type === 'repertoire'
      ? `repertoire:${selection.id}`
      : 'all';
  const sessionScopeKey = `${sessionKey}|from:${fromParam ?? ''}|chapter:${chapterParam ?? ''}|mode:${learnMode ? 'learn' : 'review'}`;

  // The session intentionally snapshots its queue so a completed line cannot
  // disappear underneath the user when Convex updates card due dates.  A key
  // makes an explicit filter switch start a fresh queue while preserving that
  // snapshot behavior during a session.
  return (
    <TrainingSession
      key={sessionScopeKey}
      initialLines={result.lines}
      filterBar={filterBar}
      studyMode={learnMode}
      initialLineId={resumeLineId}
    />
  );
}
