'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@/lib/supabase/client';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase/api';
import { CourseLibrarySearch, type CourseListItem } from './CourseLibrarySearch';
import { AppSurface, PageHeader, SecondaryButton } from '@/components/ui/Premium';

export default function CoursesListPage() {
  const { loading: isLoading, user } = useAuth();
  const isAuthenticated = Boolean(user);
  const router = useRouter();
  const [tab, setTab] = useState<'mine' | 'shared'>('mine');
  const stats = useQuery(api.training.getCachedLineStats);
  const ensureCounterSnapshot = useMutation(api.training.ensureCounterSnapshot);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // This is a cheap freshness check. It only schedules a background
    // refresh when the 20-minute snapshot is stale; the page never waits for
    // a graph traversal or displays an in-flight counter as its main state.
    void ensureCounterSnapshot({}).catch(() => undefined);
  }, [ensureCounterSnapshot, isAuthenticated]);

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
    isShared: true,
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

      {visibleStats && visibleStats.dueLines > 0 && (
        <section className="mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-[color:var(--paper-edge)] py-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[2.9rem] font-semibold leading-none tabular-nums text-[color:var(--margin-red)]">
              {visibleStats.dueLines}
            </span>
            <span className="text-[32px] leading-none text-[color:var(--ink-soft)]">to repeat now</span>
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
