import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

export default async function AnalyzePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <PlaceholderPage
      title="Analyze"
      body="Phase 4 will land here: pull recent games from Lichess/Chess.com and find the deviation point."
    />
  );
}
