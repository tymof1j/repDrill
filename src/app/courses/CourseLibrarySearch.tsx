'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { useQuery } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { api } from '@convex/_generated/api';
import {
  EmptyState,
  GhostButton,
  SecondaryButton,
} from '@/components/ui/Premium';
import { deleteCourseAction, renameCourseAction } from './actions';
import {
  CourseCover,
  ProgressBar,
  getCourseMeta,
  type CourseKind,
} from './CourseVisuals';
import { useBookProgress } from '@/lib/hooks/useBookProgress';
import type { BookProgressSnapshot } from '@/lib/woodpeckerProgress';
import type { BookTrainingKey } from '@/lib/bookTrainingPreferences';

export type CourseListItem = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  href?: string;
  mode?: 'theory' | 'puzzles';
  isBuiltIn?: boolean;
  isShared?: boolean;
};

export type CourseLineProgressSummary = {
  courseId: string;
  total: number;
  learned: number;
  due: number;
  newLines: number;
};

type Props = {
  courses: CourseListItem[];
};

type LibraryFilter = 'all' | CourseKind;

export function CourseLibrarySearch({ courses }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [, startTransition] = useTransition();

  const saveRename = (id: string) => {
    if (!renameDraft.trim()) return;
    const fd = new FormData();
    fd.set('id', id);
    fd.set('name', renameDraft.trim());
    startTransition(() => void renameCourseAction(fd));
    setRenameTargetId(null);
  };

  const fuse = useMemo(
    () =>
      new Fuse(courses, {
        keys: ['name', 'description', 'color', 'mode'],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [courses],
  );

  const visibleCourses = useMemo(() => {
    const trimmed = query.trim();
    const searched = trimmed ? fuse.search(trimmed).map((result) => result.item) : courses;
    if (filter === 'all') return searched;
    return searched.filter((course) => getCourseMeta(course.name, course.description, course.mode).kind === filter);
  }, [courses, filter, fuse, query]);
  const trainableCourseIds = useMemo(
    () => courses
      .filter((course) => !course.isBuiltIn && !course.isShared)
      .map((course) => course.id as Id<'courses'>),
    [courses],
  );
  const progressRows = useQuery(
    api.training.getCourseLineProgress,
    trainableCourseIds.length > 0 ? { courseIds: trainableCourseIds, version: 2 } : 'skip',
  ) as CourseLineProgressSummary[] | undefined;
  const progressByCourseId = useMemo(
    () => new Map((progressRows ?? []).map((row) => [row.courseId, row])),
    [progressRows],
  );
  if (courses.length === 0) {
    return <EmptyState>No courses yet. Import a PGN or a Lichess study to seed your first body of theory.</EmptyState>;
  }

  return (
    <div>
      <div className="mb-8 rounded-[1.35rem] border border-[color:var(--paper-rule)] bg-[color:var(--surface)] p-3 shadow-[0_16px_45px_rgba(47,58,50,0.05)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-4 py-3 focus-within:border-[color:var(--library-green)]">
            <span aria-hidden className="font-mono text-sm text-[color:var(--ink-faint)]">/</span>
            <span className="sr-only">Search courses</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your opening library"
              className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-ghost)]"
            />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-ghost)] sm:inline">{visibleCourses.length} shown</span>
          </label>
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-[color:var(--paper-shade)] p-1" role="tablist" aria-label="Course type">
            {([
              ['all', 'All'],
              ['opening', 'Openings'],
              ['theory', 'Theory'],
              ['puzzles', 'Puzzles'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-[background-color,color,transform] duration-200 active:scale-[0.98] ${filter === value ? 'bg-[color:var(--ink)] text-[color:var(--paper)] shadow-sm' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink)]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleCourses.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[color:var(--paper-edge)] bg-[color:var(--surface-soft)] px-8 py-16 text-center">
          <p className="font-display text-lg text-[color:var(--ink-soft)]">No course matches that filter.</p>
          <SecondaryButton onClick={() => { setQuery(''); setFilter('all'); }} className="mt-5">Reset filters</SecondaryButton>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((course, index) => (
            <CourseCard
              key={`${course.id}:${progressByCourseId.get(course.id)?.total ?? 'pending'}:${progressByCourseId.get(course.id)?.learned ?? 'pending'}:${progressByCourseId.get(course.id)?.due ?? 'pending'}`}
              course={course}
              featured={index === 0 && !query.trim() && filter === 'all'}
              isDeleting={deleteTargetId === course.id}
              isRenaming={renameTargetId === course.id}
              renameDraft={renameDraft}
              onRenameDraftChange={setRenameDraft}
              onRename={() => { setRenameDraft(course.name); setRenameTargetId(course.id); setDeleteTargetId(null); }}
              onRenameSave={() => saveRename(course.id)}
              onRenameCancel={() => setRenameTargetId(null)}
              onDelete={() => setDeleteTargetId(course.id)}
              onDeleteCancel={() => setDeleteTargetId(null)}
              lineProgress={progressByCourseId.get(course.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({
  course,
  featured,
  isDeleting,
  isRenaming,
  renameDraft,
  onRenameDraftChange,
  onRename,
  onRenameSave,
  onRenameCancel,
  onDelete,
  onDeleteCancel,
  lineProgress,
}: {
  course: CourseListItem;
  featured: boolean;
  isDeleting: boolean;
  isRenaming: boolean;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onRename: () => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onDelete: () => void;
  onDeleteCancel: () => void;
  lineProgress?: CourseLineProgressSummary;
}) {
  const meta = getCourseMeta(course.name, course.description, course.mode);
  const bookProgress = useBuiltInBookProgress(course);
  const progress = getProgress(course, lineProgress, bookProgress);
  const href = course.href ?? `/courses/${course.id}`;
  const learnHref = course.isBuiltIn
    ? getBuiltInBookLearnHref(course, bookProgress) ?? course.href ?? href
    : `/train?courseId=${encodeURIComponent(course.id)}&mode=learn`;
  const reviewHref = course.mode === 'puzzles'
    ? getBuiltInBookReviewHref(course, bookProgress) ?? course.href ?? '/train'
    : `/train?courseId=${encodeURIComponent(course.id)}`;

  return (
    <article className={`group flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-[color:var(--paper-rule)] bg-[color:var(--surface)] shadow-[0_18px_50px_rgba(47,58,50,0.06)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[color:var(--library-green-soft)] hover:shadow-[0_24px_58px_rgba(47,58,50,0.12)] ${featured ? 'md:col-span-2 md:grid md:grid-cols-[minmax(15rem,0.82fr)_minmax(0,1.18fr)]' : ''}`}>
      <Link href={href} className={`block p-3 pb-0 ${featured ? 'md:p-4 md:pr-0 md:pb-4' : 'sm:p-4 sm:pb-0'}`} aria-label={`Open ${course.name}`}>
        <CourseCover name={course.name} kind={meta.kind} compact={!featured} />
      </Link>

      <div className={`flex min-w-0 flex-1 flex-col p-5 sm:p-6 ${featured ? 'md:p-7' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[color:var(--ink-soft)]">{meta.kindLabel}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">{course.color === 'both' ? 'White + Black' : `${course.color} repertoire`}</span>
            </div>
            {isRenaming ? (
              <div className="space-y-3">
                <input
                  value={renameDraft}
                  onChange={(event) => onRenameDraftChange(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') onRenameSave(); if (event.key === 'Escape') onRenameCancel(); }}
                  className="w-full border-b border-[color:var(--ink)] bg-transparent pb-1 font-display text-xl font-semibold text-[color:var(--ink)] outline-none"
                  autoFocus
                />
                <div className="flex gap-3"><SecondaryButton onClick={onRenameSave}>Save</SecondaryButton><GhostButton onClick={onRenameCancel}>Cancel</GhostButton></div>
              </div>
            ) : (
              <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] focus-visible:ring-offset-2">
                <h2 className="line-clamp-2 font-display text-[1.38rem] font-semibold leading-[1.1] tracking-[-0.035em] text-[color:var(--ink)]">{course.name}</h2>
              </Link>
            )}
          </div>
          {!course.isBuiltIn && !course.isShared && !isRenaming && (
            <button type="button" onClick={onRename} title="Rename course" aria-label={`Rename ${course.name}`} className="shrink-0 rounded-lg p-2 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--ink-ghost)] opacity-60 transition-colors hover:bg-[color:var(--paper-shade)] hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]">
              Edit
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[color:var(--paper-shade)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--ink-faint)]">{meta.openingLabel}</span>
          {meta.theoryLabels.slice(0, 2).map((label) => <span key={label} className="rounded-full bg-[color:var(--paper-shade)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--ink-faint)]">{label}</span>)}
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-[color:var(--ink-soft)]">{meta.shortDescription}</p>

        <div className="mt-6 border-t border-[color:var(--paper-rule)] pt-5">
          <ProgressBar value={progress.percent} tone={progress.due > 0 ? 'red' : 'green'} label={progress.label} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.13em] text-[color:var(--ink-faint)]">
            <span>{progress.variationLabel}</span>
            <span className={progress.due > 0 ? 'text-[color:var(--margin-red)]' : ''}>{progress.dueLabel}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link href={learnHref} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[color:var(--ink)] px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--paper)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--library-green)] active:translate-y-0">Learn<span aria-hidden className="ml-2">→</span></Link>
          <Link href={reviewHref} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--ink)] transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--surface)] active:translate-y-0">Review{progress.due > 0 ? ` · ${progress.due}` : ''}</Link>
        </div>

        {course.isBuiltIn ? (
          <span className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--library-green)]">Included with RepDrill</span>
        ) : course.isShared ? (
          <span className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--gilt)]">Shared study</span>
        ) : isDeleting ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-[color:var(--paper-shade)] px-3 py-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--margin-red)]">Delete this course?</span><div className="flex items-center gap-2"><GhostButton onClick={onDeleteCancel}>Cancel</GhostButton><form action={deleteCourseAction}><input type="hidden" name="id" value={course.id} /><button type="submit" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--margin-red)] hover:underline">Delete</button></form></div></div>
        ) : (
          <button type="button" onClick={onDelete} className="mt-4 self-start font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-ghost)] transition-colors hover:text-[color:var(--margin-red)]">Manage course · Delete</button>
        )}
      </div>
    </article>
  );
}

function getProgress(
  course: CourseListItem,
  summary: CourseLineProgressSummary | undefined,
  bookProgress: BookProgressSnapshot | null = null,
) {
  if (course.isBuiltIn) {
    const count = bookProgress?.setSize
      ?? (course.name.toLowerCase().includes('woodpecker method 2') ? 1000 : course.name.toLowerCase().includes('woodpecker') ? 1128 : 0);
    const solved = bookProgress?.solvedCount ?? 0;
    const missed = bookProgress?.missedCount ?? 0;
    const cycle = bookProgress?.cycle ?? 1;
    const attempts = bookProgress?.attemptCount ?? 0;
    const percent = count ? (solved / count) * 100 : 0;
    return {
      percent,
      label: solved ? `Cycle ${cycle} · ${Math.round(percent)}%` : `Cycle ${cycle} · Not started`,
      variationLabel: count
        ? `${solved.toLocaleString()} / ${count.toLocaleString()} positions${attempts > 0 ? ` · ${attempts.toLocaleString()} attempts` : ''}`
        : 'Progress not started',
      due: missed,
      dueLabel: missed > 0 ? `${missed} missed` : 'Ready when you are',
    };
  }
  if (!summary) {
    return { percent: 0, label: 'Loading progress', variationLabel: 'Reading course positions…', due: 0, dueLabel: 'Please wait' };
  }
  if (summary.total === 0) {
    return { percent: 0, label: 'Ready to train', variationLabel: 'Open course to create review cards', due: 0, dueLabel: 'Ready when you are' };
  }
  const percent = (summary.learned / summary.total) * 100;
  return {
    percent,
    label: `${Math.round(percent)}%`,
    variationLabel: `${summary.learned} / ${summary.total} positions`,
    due: summary.due,
    dueLabel: summary.due > 0 ? `${summary.due} due` : 'Ready when you are',
  };
}

function useBuiltInBookProgress(course: CourseListItem): BookProgressSnapshot | null {
  const book = getBuiltInBookKey(course);
  const fullBookSize = book === 'woodpecker-method-2' ? 1000 : 1128;
  return useBookProgress(book, fullBookSize).progress;
}

function getBuiltInBookReviewHref(
  course: CourseListItem,
  progress: BookProgressSnapshot | null,
) {
  const book = getBuiltInBookKey(course);
  if (!book) return null;
  const nextExercise = progress?.missed[0] ?? progress?.position ?? 1;
  const fullBookSize = book === 'woodpecker-method-2' ? 1000 : 1128;
  const exercise = Math.min(Math.max(nextExercise, 1), fullBookSize);
  const slug = book === 'woodpecker-method-2' ? 'woodpecker-2' : 'woodpecker';
  return `/train/puzzles/${slug}?n=${exercise}`;
}

function getBuiltInBookLearnHref(
  course: CourseListItem,
  progress: BookProgressSnapshot | null,
) {
  const book = getBuiltInBookKey(course);
  if (!book) return null;

  const fullBookSize = book === 'woodpecker-method-2' ? 1000 : 1128;
  const setSize = Math.min(Math.max(progress?.setSize ?? fullBookSize, 1), fullBookSize);
  const firstCandidate = Math.min(Math.max(progress?.position ?? 1, 1), setSize);
  const solved = new Set(progress?.solved ?? []);

  // Resume from the cursor in the last started cycle.  If the user opened a
  // later puzzle manually, wrap only after that cursor, so an unfinished
  // earlier puzzle never forces Learn back to a difficulty/start screen.
  let exercise: number | null = null;
  for (let candidate = firstCandidate; candidate <= setSize; candidate += 1) {
    if (!solved.has(candidate)) {
      exercise = candidate;
      break;
    }
  }
  if (exercise === null) {
    for (let candidate = 1; candidate < firstCandidate; candidate += 1) {
      if (!solved.has(candidate)) {
        exercise = candidate;
        break;
      }
    }
  }

  // A completed cycle has no unsolved position. Keep the user in that same
  // cycle; the trainer presents the explicit "start next cycle" action.
  const target = exercise ?? firstCandidate;
  const slug = book === 'woodpecker-method-2' ? 'woodpecker-2' : 'woodpecker';
  return `/train/puzzles/${slug}?n=${target}`;
}

function getBuiltInBookKey(course: CourseListItem): BookTrainingKey | null {
  if (!course.isBuiltIn) return null;
  const normalized = `${course.id} ${course.name}`.toLowerCase();
  if (normalized.includes('woodpecker-method-2') || normalized.includes('woodpecker method 2')) {
    return 'woodpecker-method-2';
  }
  if (normalized.includes('woodpecker')) return 'woodpecker-method';
  return null;
}
