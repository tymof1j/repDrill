import { notFound, redirect } from 'next/navigation';
import { convexAuthNextjsToken } from '@/lib/workos/convex-compat';
import { fetchQuery } from '@/lib/supabase/server-client';
import { api } from '@/lib/supabase/api';
import type { Id } from '@/lib/supabase/types';
import { AppSurface, BackLink, PageHeader } from '@/components/ui/Premium';
import { PgnImportForm } from './PgnImportForm';

export default async function ImportPgnPage({ params }: { params: Promise<{ id: string }> }) {
  const token = await convexAuthNextjsToken();
  if (!token) redirect('/login');

  const { id } = await params;
  const course = await fetchQuery(api.courses.get, { id: id as Id<"courses"> }, { token });
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
        body="Drop a PGN file, paste from disk, or transcribe directly. PGN records sharing a Chapter header are grouped into one chapter with multiple lines."
      />

      <PgnImportForm courseId={id} />
    </AppSurface>
  );
}
