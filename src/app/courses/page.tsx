'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useConvex, useQuery, useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@convex/_generated/api';
import { CourseLibrarySearch, type CourseListItem } from './CourseLibrarySearch';
import { AppSurface, PageHeader, SecondaryButton } from '@/components/ui/Premium';

export default function CoursesListPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const convex = useConvex();
  const [stats, setStats] = useState<{ totalLines: number; dueLines: number; newLines: number } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return;

    (async () => {
      try {
        const lineStats = await convex.query(api.training.getLineStats, {});
        if (!cancelled) setStats(lineStats);
      } catch {
        try {
          const quick = await convex.query(api.training.getQuickStats, {});
          if (!cancelled) setStats(quick);
        } catch {
          if (!cancelled) setStats(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [convex, isAuthenticated]);

  const items = useQuery(api.courses.list);
  if (!isAuthenticated || items === undefined) return null;

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
        action={<SecondaryButton href="/courses/new">New course</SecondaryButton>}
      />

      {stats && stats.totalLines > 0 && (
        <section className="mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-[color:var(--paper-edge)] py-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[2.9rem] font-semibold leading-none tabular-nums text-[color:var(--margin-red)]">
              {stats.dueLines}
            </span>
            <span className="text-[32px] leading-none text-[color:var(--ink-soft)]">due</span>
            <span className="text-[color:var(--ink-ghost)]">/</span>
            <span className="text-[32px] leading-none tabular-nums text-[color:var(--ink-faint)]">
              {stats.totalLines}
            </span>
            <span className="text-[32px] leading-none text-[color:var(--ink-ghost)]">total</span>
            {stats.newLines > 0 && (
              <>
                <span className="ml-1 text-[color:var(--ink-ghost)]">·</span>
                <span className="font-mono text-[20px] font-medium uppercase tracking-[0.18em] text-[color:var(--gilt)]">
                  {stats.newLines} new
                </span>
              </>
            )}
          </div>
          <Link
            href="/train"
            className="inline-flex items-center gap-2 font-mono text-[18px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[6px] transition-colors duration-200 hover:text-[color:var(--margin-red)] hover:decoration-[color:var(--margin-red)]"
          >
            Train now
            <span aria-hidden>→</span>
          </Link>
        </section>
      )}

      <CourseLibrarySearch courses={courses} />
    </AppSurface>
  );
}
