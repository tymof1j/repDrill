'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@convex/_generated/api';
import { CourseLibrarySearch, type CourseListItem } from './CourseLibrarySearch';
import { AppSurface, PageHeader, PremiumButton } from '@/components/ui/Premium';

export default function CoursesListPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  const items = useQuery(api.courses.list);
  const lineData = useQuery(api.training.getQuickStats);

  if (!isAuthenticated || items === undefined || lineData === undefined) return null;

  const courses: CourseListItem[] = items.map((item) => ({
    id: item._id,
    name: item.name,
    color: item.color,
    description: item.description ?? null,
  }));

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Part I — Courses"
        title="The library."
        body="One course is one body of opening theory for one color — a self-contained chapter of preparation, like 'My Grünfeld' or 'Sicilian as Black'."
        action={<PremiumButton href="/courses/new">New course</PremiumButton>}
      />

      {lineData.totalLines > 0 && (
        <section className="mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-[color:var(--paper-edge)] py-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[2rem] font-semibold leading-none tabular-nums text-[color:var(--margin-red)]">
              {lineData.dueLines}
            </span>
            <span className="text-[13px] text-[color:var(--ink-soft)]">due</span>
            <span className="text-[color:var(--ink-ghost)]">/</span>
            <span className="text-[15px] tabular-nums text-[color:var(--ink-faint)]">
              {lineData.totalLines}
            </span>
            <span className="text-[13px] text-[color:var(--ink-ghost)]">total</span>
            {lineData.newLines > 0 && (
              <>
                <span className="ml-1 text-[color:var(--ink-ghost)]">·</span>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--gold,#b39a5b)]">
                  {lineData.newLines} new
                </span>
              </>
            )}
          </div>
          {lineData.dueLines > 0 && (
            <Link
              href="/train"
              className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[6px] transition-colors duration-200 hover:text-[color:var(--margin-red)] hover:decoration-[color:var(--margin-red)]"
            >
              Train now
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </Link>
          )}
        </section>
      )}

      <CourseLibrarySearch courses={courses} />
    </AppSurface>
  );
}
