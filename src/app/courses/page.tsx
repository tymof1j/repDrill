import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { CourseLibrarySearch, type CourseListItem } from './CourseLibrarySearch';
import {
  AppSurface,
  PageHeader,
  PremiumButton,
  StatTile,
} from '@/components/ui/Premium';

export default async function CoursesListPage() {
  const token = await convexAuthNextjsToken();
  if (!token) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const [items, lineData] = await Promise.all([
    fetchQuery(api.courses.list, {}, { token }),
    fetchQuery(api.training.getTrainingLines, {}, { token }),
  ]);
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
        <section className="mb-12 border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)]">
          <div className="flex items-center justify-between gap-4 border-b border-[color:var(--paper-edge)] px-5 py-3 md:px-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Training queue · today
            </p>
            {lineData.dueLines > 0 && (
              <PremiumButton href="/train">Train now</PremiumButton>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-6 px-5 py-7 md:px-7 md:py-8">
            <StatTile
              label="Due lines"
              value={lineData.dueLines}
              tone={lineData.dueLines > 0 ? 'red' : 'cream'}
              hint={lineData.dueLines > 0 ? 'awaiting recall' : 'none scheduled'}
            />
            <StatTile label="New lines" value={lineData.newLines} tone="gold" hint="never seen" />
            <StatTile label="Total lines" value={lineData.totalLines} hint="across all courses" />
          </div>
        </section>
      )}

      <CourseLibrarySearch courses={courses} />
    </AppSurface>
  );
}
