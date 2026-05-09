import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getCourse } from '@/lib/course/queries';
import { AppSurface, BackLink, PageHeader } from '@/components/ui/Premium';
import { PgnImportForm } from './PgnImportForm';

export default async function ImportPgnPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const course = await getCourse(session.user.id, id);
  if (!course) notFound();

  return (
    <AppSurface>
      <BackLink href={`/courses/${id}`}>{course.name}</BackLink>
      <PageHeader
        eyebrow={`PGN import · ${course.color}`}
        title={
          <>
            Add <span className="font-display-italic">theory</span> to the course.
          </>
        }
        body="Drop a PGN file, paste from disk, or transcribe directly. Each game becomes its own chapter inside this course."
      />

      <PgnImportForm courseId={id} />
    </AppSurface>
  );
}
