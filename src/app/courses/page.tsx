import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listCourses } from '@/lib/course/queries';
import { loadTrainingLines } from '@/app/train/actions';
import { CourseLibrarySearch, type CourseListItem } from './CourseLibrarySearch';
import {
  AppSurface,
  PageHeader,
  PremiumButton,
  PremiumPanel,
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
        eyebrow="Course library"
        title="Courses"
        body='One course is one body of opening theory for one color, such as "My Grunfeld".'
        action={<PremiumButton href="/courses/new">New course</PremiumButton>}
      />

      {lineData.totalLines > 0 && (
        <PremiumPanel className="mb-8">
          <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
            <StatTile
              label="Due lines"
              value={lineData.dueLines}
              tone={lineData.dueLines > 0 ? 'green' : 'cream'}
            />
            <StatTile label="New lines" value={lineData.newLines} tone="gold" />
            <StatTile label="Total lines" value={lineData.totalLines} />
            {lineData.dueLines > 0 && (
              <PremiumButton href="/train" className="md:ml-2">
                Train now
              </PremiumButton>
            )}
          </div>
        </PremiumPanel>
      )}

      <CourseLibrarySearch courses={courses} />
    </AppSurface>
  );
}
