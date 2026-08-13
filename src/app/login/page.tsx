import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo: requestedRedirectTo } = await searchParams;
  const redirectTo =
    requestedRedirectTo && requestedRedirectTo.startsWith('/') && !requestedRedirectTo.startsWith('//')
      ? requestedRedirectTo
      : '/courses';
  redirect(`/sign-in?returnTo=${encodeURIComponent(redirectTo)}`);
}
