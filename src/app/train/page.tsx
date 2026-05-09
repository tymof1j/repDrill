import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppSurface, EmptyState, PageHeader, StatTile } from '@/components/ui/Premium';
import { loadTrainingLines } from './actions';
import { TrainingSession } from './TrainingSession';

export default async function TrainPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const result = await loadTrainingLines();

  if (result.lines.length === 0) {
    return (
      <AppSurface>
        <PageHeader
          eyebrow="Training queue"
          title="Train"
          body="Nothing is due right now. Import more theory or come back when the schedule asks for recall."
        />

        <div className="mb-8 grid max-w-3xl gap-3 md:grid-cols-3">
          <StatTile label="Total lines" value={result.totalLines} />
          <StatTile label="Due lines" value={result.dueLines} tone="green" />
          <StatTile label="New lines" value={result.newLines} tone="gold" />
        </div>

        {result.totalLines === 0 && (
          <EmptyState>Import a PGN into a course to start generating review lines.</EmptyState>
        )}
      </AppSurface>
    );
  }

  return <TrainingSession initialLines={result.lines} />;
}
