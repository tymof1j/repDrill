import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUser } from '@/lib/user/queries';
import { AppSurface, PageHeader, PremiumButton } from '@/components/ui/Premium';
import { AnalyzePanel } from './AnalyzePanel';

export default async function AnalyzePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await getUser(session.user.id);
  const hasLichess = !!user?.lichessUsername;
  const hasChessCom = !!user?.chesscomUsername;

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Part IV — Analysis"
        title={
          <>
            The <span className="font-display-italic">post-mortem</span>.
          </>
        }
        body="Find the move where preparation became improvisation. Pull recent online games and let RepDrill mark each departure from the book."
        action={<PremiumButton href="/settings">Accounts</PremiumButton>}
      />

      {!hasLichess && !hasChessCom ? (
        <section className="border border-dashed border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-8 py-14 text-center">
          <p className="font-display-italic text-[15px] text-[color:var(--ink-soft)]">
            Connect a Lichess or Chess.com account first.
          </p>
          <div className="mt-6 inline-flex">
            <Link
              href="/settings"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink)] underline decoration-[color:var(--paper-edge)] underline-offset-[6px] hover:text-[color:var(--margin-red)] hover:decoration-[color:var(--margin-red)]"
            >
              Add a username →
            </Link>
          </div>
        </section>
      ) : (
        <AnalyzePanel
          initialUsername={{
            lichess: user?.lichessUsername ?? null,
            chesscom: user?.chesscomUsername ?? null,
          }}
          hasLichess={hasLichess}
          hasChessCom={hasChessCom}
        />
      )}
    </AppSurface>
  );
}
