import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { createRepertoireAction } from '../actions';
import {
  AppSurface,
  BackLink,
  FieldLabel,
  PageHeader,
  PremiumButton,
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
        eyebrow="New entry · § repertoire"
        title={
          <>
            Bind a new <span className="font-display-italic">repertoire</span>.
          </>
        }
        body="Combine multiple courses into one preparation map. When two courses overlap on the same position, you'll choose which line wins."
      />

      <form
        action={createRepertoireAction}
        className="max-w-2xl space-y-8 border-y border-[color:var(--paper-edge)] py-8"
      >
        <FieldLabel label="Name" required>
          <input
            name="name"
            required
            placeholder="My tournament repertoire"
            className={fieldClassName}
            autoFocus
          />
        </FieldLabel>

        <FieldLabel label="Description" hint="optional">
          <textarea
            name="description"
            rows={4}
            placeholder="A short note on the use of this repertoire."
            className={fieldClassName}
          />
        </FieldLabel>

        <div className="flex flex-wrap gap-3 pt-4">
          <PremiumButton type="submit">Create repertoire</PremiumButton>
          <SecondaryButton href="/repertoires">Cancel</SecondaryButton>
        </div>
      </form>
    </AppSurface>
  );
}
