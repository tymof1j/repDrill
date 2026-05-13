'use client';

import { useEffect } from 'react';
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
        action={<PremiumButton href="/courses/new">New course</PremiumButton>}
      />

      <CourseLibrarySearch courses={courses} />
    </AppSurface>
  );
}
