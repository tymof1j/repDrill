import { notFound } from 'next/navigation';
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { AppSurface, PageHeader, BackLink } from '@/components/ui/Premium';

export default async function SharedCoursePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const isLoggedIn = await isAuthenticatedNextjs();

  // TODO: Implement shared course viewing with Convex
  // This requires a public query that looks up courses by share token
  return (
    <AppSurface>
      <BackLink href="/">Home</BackLink>
      <PageHeader
        eyebrow="Shared course"
        title="Shared Course"
        body="Shared course viewing is being migrated to the new backend. Please check back soon."
      />
      <p className="py-8 text-center font-display-italic text-[color:var(--ink-soft)]">
        This feature is temporarily unavailable during the platform migration.
      </p>
    </AppSurface>
  );
}
