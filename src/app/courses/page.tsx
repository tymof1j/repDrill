import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listCourses } from '@/lib/course/queries';
import { loadTrainingLines } from '@/app/train/actions';
import { CourseLibrarySearch, type CourseListItem } from './CourseLibrarySearch';
import {
  AppSurface,
  PageHeader,
  PremiumButton,
  StatTile,
} from '@/components/ui/Premium';

export default async function CoursesListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [items, lineData] = await Promise.all([
    listCourses(session.user.id),
    loadTrainingLines(),
  ]);
  const courses: CourseListItem[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    color: item.color,
    description: item.description,
  }));

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Part I — Courses"
        title={
          <>
            The <span className="font-display-italic">library</span>.
          </>
        }
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
