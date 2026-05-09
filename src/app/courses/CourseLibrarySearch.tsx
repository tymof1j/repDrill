'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import {
  EmptyState,
  GhostButton,
  SecondaryButton,
  Stamp,
} from '@/components/ui/Premium';
import { deleteCourseAction } from './actions';

export type CourseListItem = {
  id: string;
  name: string;
  color: string;
  description: string | null;
};

type Props = {
  courses: CourseListItem[];
};

export function CourseLibrarySearch({ courses }: Props) {
  const [query, setQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fuse = useMemo(
    () =>
      new Fuse(courses, {
        keys: ['name', 'description', 'color'],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [courses],
  );

  const visibleCourses = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return courses;
    return fuse.search(trimmed).map((result) => result.item);
  }, [courses, fuse, query]);

  if (courses.length === 0) {
    return (
      <EmptyState>
        No courses yet. Begin by importing a PGN or a Lichess study to seed
        your first body of theory.
      </EmptyState>
    );
  }

  return (
    <div>
      {/* Search — single ruled line, no chrome */}
      <div className="mb-10 flex flex-wrap items-baseline gap-x-6 gap-y-3 border-b border-[color:var(--paper-edge)] pb-3">
        <label className="flex flex-1 min-w-[260px] items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Find
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, color, or note…"
            className="font-display flex-1 bg-transparent text-2xl italic text-[color:var(--ink)] placeholder:text-[color:var(--ink-ghost)] focus:outline-none"
          />
        </label>
        <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-[color:var(--ink-faint)] tabular-nums">
          {visibleCourses.length} / {courses.length}
        </p>
      </div>

      {visibleCourses.length === 0 ? (
        <div className="border border-dashed border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-8 py-12 text-center">
          <p className="font-display-italic text-lg text-[color:var(--ink-soft)]">
            Nothing in the index matches that.
          </p>
          <SecondaryButton onClick={() => setQuery('')} className="mt-5">
            Clear
          </SecondaryButton>
        </div>
      ) : (
        <ol className="divide-y divide-[color:var(--paper-rule)] border-y border-[color:var(--paper-edge)]">
          {visibleCourses.map((course, idx) => {
            const num = String(idx + 1).padStart(2, '0');
            const isDeleting = deleteTargetId === course.id;
            return (
              <li
                key={course.id}
                className="group relative grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-5 gap-y-2 py-6 transition-colors duration-200 hover:bg-[color:var(--paper-shade)] md:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] md:gap-x-8 md:py-7"
              >
                <span
                  className="font-display text-2xl italic text-[color:var(--ink-faint)] group-hover:text-[color:var(--margin-red)]"
                  style={{ fontFeatureSettings: '"onum"' }}
                >
                  {num}
                </span>

                <Link
                  href={`/courses/${course.id}`}
                  className="block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
                >
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-display text-2xl font-medium leading-tight text-[color:var(--ink)] underline decoration-transparent decoration-1 underline-offset-[6px] transition-colors duration-200 group-hover:decoration-[color:var(--margin-red)] md:text-[1.65rem]">
                      {course.name}
                    </h2>
                    <Stamp tone={course.color === 'white' ? 'ink' : 'red'}>
                      {course.color}
                    </Stamp>
                  </div>
                  {course.description && (
                    <p className="mt-2 font-display-italic max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
                      {course.description}
                    </p>
                  )}
                </Link>

                <p className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-ghost)] md:block">
                  Open to manage chapters,
                  <br />
                  annotations, and lines.
                </p>

                <div className="col-start-2 flex items-center gap-3 md:col-start-4 md:justify-self-end">
                  {isDeleting ? (
                    <form action={deleteCourseAction} className="flex items-center gap-3">
                      <input type="hidden" name="id" value={course.id} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--margin-red)]">
                        Confirm?
                      </span>
                      <GhostButton
                        type="button"
                        onClick={() => setDeleteTargetId(null)}
                      >
                        Cancel
                      </GhostButton>
                      <button
                        type="submit"
                        className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--margin-red)] underline decoration-[color:var(--margin-red)] decoration-1 underline-offset-[6px] hover:opacity-80"
                      >
                        Delete
                      </button>
                    </form>
                  ) : (
                    <GhostButton onClick={() => setDeleteTargetId(course.id)}>
                      Delete
                    </GhostButton>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
