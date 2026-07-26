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
  const [tab, setTab] = useState<'mine' | 'shared'>('mine');

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
  const sharedItems = useQuery(api.sharing.listSharedCourses);
  if (!isAuthenticated || items === undefined || sharedItems === undefined) return null;

  const courses: CourseListItem[] = items.map((item) => ({
    id: item._id,
    name: item.name,
    color: item.color,
    description: item.description ?? null,
  }));
  courses.unshift({
    id: 'woodpecker-method-2',
    name: 'The Woodpecker Method 2',
    color: 'both',
    mode: 'puzzles',
    href: '/courses/woodpecker-2',
    isBuiltIn: true,
    description:
      '1,000 positional exercises from Axel Smith on priyomes and rules of thumb, with full book explanations and author-guided cycles.',
  });
  courses.unshift({
    id: 'woodpecker-method',
    name: 'The Woodpecker Method',
    color: 'both',
    mode: 'puzzles',
    href: '/courses/woodpecker',
    isBuiltIn: true,
    description:
      '1,128 tactical positions from Axel Smith and Hans Tikkanen, with the original game, year, book explanation, and interactive solution.',
  });
  const sharedCourses: CourseListItem[] = sharedItems.map((item) => ({
    id: item.resource._id,
    name: item.resource.name,
    color: item.resource.color,
    description: `Shared by ${item.owner?.name ?? item.owner?.email ?? 'another RepDrill user'} · ${item.invitation.access}`,
  }));
  const visibleStats = stats;

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Your training library"
        title="Choose what to train."
        body="Open a puzzle course to solve positions, or a theory course to learn and remember your opening lines."
        action={<SecondaryButton href="/courses/new">New course</SecondaryButton>}
      />

      {visibleStats && visibleStats.totalLines > 0 && (
        <section className="mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-[color:var(--paper-edge)] py-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[2.9rem] font-semibold leading-none tabular-nums text-[color:var(--margin-red)]">
              {visibleStats.dueLines}
            </span>
            <span className="text-[32px] leading-none text-[color:var(--ink-soft)]">due</span>
            <span className="text-[color:var(--ink-ghost)]">/</span>
            <span className="text-[32px] leading-none tabular-nums text-[color:var(--ink-faint)]">
              {visibleStats.totalLines}
            </span>
            <span className="text-[32px] leading-none text-[color:var(--ink-ghost)]">total</span>
            {visibleStats.newLines > 0 && (
              <>
                <span className="ml-1 text-[color:var(--ink-ghost)]">·</span>
                <span className="font-mono text-[20px] font-medium uppercase tracking-[0.18em] text-[color:var(--gilt)]">
                  {visibleStats.newLines} new
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

      <div className="mb-6 flex flex-wrap gap-2 border-b border-[color:var(--paper-edge)] pb-3">
        <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
          My courses
        </TabButton>
        <TabButton active={tab === 'shared'} onClick={() => setTab('shared')}>
          Shared with you
        </TabButton>
      </div>

      <CourseLibrarySearch courses={tab === 'mine' ? courses : sharedCourses} />
    </AppSurface>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
        active
          ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]'
          : 'border-[color:var(--paper-edge)] text-[color:var(--ink-soft)] hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]'
      }`}
    >
      {children}
    </button>
  );
}
