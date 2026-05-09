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

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Appendix — Settings"
        title={
          <>
            The <span className="font-display-italic">colophon</span>.
          </>
        }
        body="Connect chess accounts so RepDrill can pull your recent games and mark each departure from preparation."
      />

      <PremiumPanel className="mb-10 max-w-2xl" innerClassName="px-6 py-7 md:px-8 md:py-8">
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
          <div className="pt-2">
            <PremiumButton type="submit">Save</PremiumButton>
          </div>
        </form>
      </PremiumPanel>

      <DataPanel />
    </AppSurface>
  );
}
