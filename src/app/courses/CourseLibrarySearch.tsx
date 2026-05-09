'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import {
  EmptyState,
  PremiumPanel,
  SecondaryButton,
  fieldClassName,
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
    return <EmptyState>No courses yet. Create one to import a PGN or Lichess study.</EmptyState>;
  }

  return (
    <div className="space-y-5">
      <PremiumPanel>
        <section className="p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#8fa3a0]">
                Search courses
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a course by name, side, or description..."
                className={`${fieldClassName} py-3`}
              />
            </label>
            <p className="text-sm text-[#9fb0aa]">
              {visibleCourses.length} of {courses.length}
            </p>
          </div>
        </section>
      </PremiumPanel>

      {visibleCourses.length === 0 ? (
        <PremiumPanel>
          <div className="flex flex-col gap-4 p-8 text-center md:items-center">
            <p className="text-sm leading-6 text-[#c9bea4]">No courses match that search.</p>
            <SecondaryButton onClick={() => setQuery('')} className="mx-auto px-4 py-2 text-xs">
              Clear search
            </SecondaryButton>
          </div>
        </PremiumPanel>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visibleCourses.map((course) => (
            <li
              key={course.id}
              className="rounded-2xl border border-[#263337] bg-[#182225] p-1"
            >
              <div className="flex h-full flex-col justify-between rounded-[0.875rem] bg-[#10191b] p-5">
                <Link
                  href={`/courses/${course.id}`}
                  className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10191b]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3a0]">
                        {course.color}
                      </span>
                      <h2 className="mt-3 text-2xl font-semibold text-[#f4faf7] transition-colors duration-200 group-hover:text-[#7dd3c7]">
                        {course.name}
                      </h2>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#223034] text-sm text-[#a8e7df] transition-transform duration-200 group-hover:translate-x-0.5">
                      &gt;
                    </span>
                  </div>
                  {course.description && (
                    <p className="mt-4 text-sm leading-6 text-[#9fb0aa]">{course.description}</p>
                  )}
                </Link>
                <div className="mt-6 border-t border-[#263337] pt-4">
                  {deleteTargetId === course.id ? (
                    <form action={deleteCourseAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={course.id} />
                      <span className="mr-auto text-xs text-[#ff9f8e]">Delete this course?</span>
                      <SecondaryButton
                        type="button"
                        onClick={() => setDeleteTargetId(null)}
                        className="px-3 py-2 text-xs"
                      >
                        Cancel
                      </SecondaryButton>
                      <SecondaryButton type="submit" className="border-[#ff9f8e]/30 px-3 py-2 text-xs text-[#ff9f8e]">
                        Delete
                      </SecondaryButton>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[#8fa3a0]">Open to manage chapters and annotations.</span>
                      <SecondaryButton
                        onClick={() => setDeleteTargetId(course.id)}
                        className="px-3 py-2 text-xs"
                      >
                        Delete
                      </SecondaryButton>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
