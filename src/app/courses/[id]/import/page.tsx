import { notFound, redirect } from 'next/navigation';
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
