'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@convex/_generated/api';
import { AppSurface, PageHeader, PremiumButton } from '@/components/ui/Premium';
import { AnalyzePanel } from './AnalyzePanel';

export default function AnalyzePage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  const user = useQuery(api.users.current);

  useEffect(() => {
    if (user === null && !isLoading) router.push('/login');
  }, [user, isLoading, router]);

  if (!isAuthenticated || user === undefined || user === null) return null;

  const hasLichess = !!user.lichessUsername;
  const hasChessCom = !!user.chesscomUsername;

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Part IV — Analysis"
        title="The post-mortem."
        body="Find the move where preparation became improvisation. Pull recent online games and let RepDrill mark each departure from the book."
        action={<PremiumButton href="/settings#accounts">Accounts</PremiumButton>}
      />

      {!hasLichess && !hasChessCom ? (
        <section className="border border-dashed border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-8 py-14 text-center">
          <p className="font-display-italic text-[15px] text-[color:var(--ink-soft)]">
            Connect a Lichess or Chess.com account first.
          </p>
          <div className="mt-6 inline-flex">
            <Link
              href="/settings#accounts"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] underline-offset-[6px] hover:text-[color:var(--margin-red)] hover:decoration-[color:var(--margin-red)]"
            >
              Add a username →
            </Link>
          </div>
        </section>
      ) : (
        <AnalyzePanel
          initialUsername={{
            lichess: user.lichessUsername ?? null,
            chesscom: user.chesscomUsername ?? null,
          }}
          hasLichess={hasLichess}
          hasChessCom={hasChessCom}
        />
      )}
    </AppSurface>
  );
}
