import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

export default async function AnalyzePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <PlaceholderPage
      title="Analysis."
      body="Find the move where preparation became improvisation. Pull recent online games and let RepDrill mark each departure from the book."
    />
  );
}
