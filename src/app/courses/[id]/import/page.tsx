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
        eyebrow="PGN import"
        title="Import theory"
        body="Paste PGN, drop a file, or browse from disk. Each game becomes a chapter while variations and comments are preserved."
      />

      <PgnImportForm courseId={id} />
    </AppSurface>
  );
}
