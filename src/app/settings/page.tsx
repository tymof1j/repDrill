import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUser } from '@/lib/user/queries';
import {
  AppSurface,
  PageHeader,
  PremiumPanel,
  PremiumButton,
  FieldLabel,
  fieldClassName,
} from '@/components/ui/Premium';
import { updateUsernamesAction } from './actions';
import { DataPanel } from './DataPanel';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await getUser(session.user.id);
  const language = user?.language ?? 'en';

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Appendix — Settings"
        title={
          <>
            The <span className="font-display-italic">colophon</span>.
          </>
        }
        body="Account preferences and connected chess platforms. Settings here power features like Analyze."
      />

      <nav
        aria-label="Settings sections"
        className="mb-10 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]"
      >
        <a className="hover:text-[color:var(--ink)]" href="#accounts">
          · Accounts
        </a>
        <a className="hover:text-[color:var(--ink)]" href="#data">
          · Other settings & export
        </a>
      </nav>

      <section
        id="accounts"
        aria-labelledby="accounts-heading"
        className="mb-12 scroll-mt-24"
      >
        <header className="mb-5">
          <h2
            id="accounts-heading"
            className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-3xl"
          >
            Accounts
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
            Connect chess accounts so RepDrill can pull your recent games and mark each departure
            from preparation.
          </p>
        </header>

        <PremiumPanel className="max-w-2xl" innerClassName="px-6 py-7 md:px-8 md:py-8">
          <form action={updateUsernamesAction} className="space-y-6">
            <FieldLabel label="Lichess username" hint="public games — no auth needed">
              <input
                name="lichess"
                defaultValue={user?.lichessUsername ?? ''}
                placeholder="e.g. DrNykterstein"
                className={fieldClassName}
                autoComplete="off"
              />
            </FieldLabel>
            <FieldLabel label="Chess.com username" hint="public games — no auth needed">
              <input
                name="chesscom"
                defaultValue={user?.chesscomUsername ?? ''}
                placeholder="e.g. magnuscarlsen"
                className={fieldClassName}
                autoComplete="off"
              />
            </FieldLabel>



            <div className="flex items-center gap-3 pt-2">
              <PremiumButton type="submit">Save</PremiumButton>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                Saves accounts
              </p>
            </div>
          </form>
        </PremiumPanel>
      </section>

      <section id="data" aria-labelledby="data-heading" className="scroll-mt-24">
        <header className="mb-5">
          <h2
            id="data-heading"
            className="font-display text-2xl font-semibold tracking-[-0.01em] text-[color:var(--ink)] md:text-3xl"
          >
            Other settings & export
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
            Import courses, export your library, and manage your stored data.
          </p>
        </header>
        <DataPanel />
      </section>
    </AppSurface>
  );
}
