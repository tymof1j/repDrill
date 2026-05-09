import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { createRepertoireAction } from '../actions';
import {
  AppSurface,
  BackLink,
  FieldLabel,
  PageHeader,
  PremiumButton,
  PremiumPanel,
  SecondaryButton,
  fieldClassName,
} from '@/components/ui/Premium';

export default async function NewRepertoirePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return (
    <AppSurface>
      <BackLink href="/repertoires">Repertoires</BackLink>
      <PageHeader
        eyebrow="New repertoire"
        title="Create a repertoire"
        body="Combine multiple courses into one preparation map for tournament work."
      />

      <PremiumPanel className="max-w-2xl">
        <form action={createRepertoireAction} className="space-y-6 p-6 md:p-8">
          <FieldLabel label="Name" required>
            <input
              name="name"
              required
              placeholder="My tournament repertoire"
              className={fieldClassName}
            />
          </FieldLabel>

          <FieldLabel label="Description">
            <textarea
              name="description"
              rows={4}
              placeholder="Optional notes"
              className={fieldClassName}
            />
          </FieldLabel>

          <div className="flex flex-col gap-3 sm:flex-row">
            <PremiumButton type="submit">Create</PremiumButton>
            <SecondaryButton href="/repertoires">Cancel</SecondaryButton>
          </div>
        </form>
      </PremiumPanel>
    </AppSurface>
  );
}
