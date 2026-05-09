import { AppSurface, EmptyState, PageHeader } from '@/components/ui/Premium';

export function PlaceholderPage({ title, body }: { title: string; body: string }) {
  return (
    <AppSurface>
      <PageHeader eyebrow="Analysis lab" title={title} body={body} />
      <EmptyState>
        This workspace is ready for the game-analysis flow: provider import, deviation detection,
        and focused review recommendations.
      </EmptyState>
    </AppSurface>
  );
}
