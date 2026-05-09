import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { createCourseAction } from '../actions';
import {
  AppSurface,
  BackLink,
  FieldLabel,
  PageHeader,
  PremiumButton,
  SecondaryButton,
  fieldClassName,
} from '@/components/ui/Premium';

export default async function NewCoursePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return (
    <AppSurface>
      <BackLink href="/courses">Courses</BackLink>
      <PageHeader
        eyebrow="New entry · § course"
        title={
          <>
            Begin a new <span className="font-display-italic">course</span>.
          </>
        }
        body="Name a body of opening theory and pick the side it covers. Import PGN chapters once the course exists."
      />

      <form action={createCourseAction} className="max-w-2xl space-y-8 border-y border-[color:var(--paper-edge)] py-8">
        <FieldLabel label="Name" required>
          <input
            name="name"
            required
            placeholder="My Grünfeld"
            className={fieldClassName}
            autoFocus
          />
        </FieldLabel>

        <FieldLabel label="Color" required>
          <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-[color:var(--paper-edge)] sm:border sm:border-[color:var(--paper-edge)]">
            {(['white', 'black'] as const).map((color, idx) => (
              <label
                key={color}
                className={`group flex cursor-pointer items-baseline gap-3 px-4 py-4 transition-colors duration-200 hover:bg-[color:var(--paper-deep)] has-[:checked]:bg-[color:var(--paper-deep)] ${
                  idx === 0 ? 'border-b border-[color:var(--paper-edge)] sm:border-b-0' : 'border border-[color:var(--paper-edge)] sm:border-0'
                }`}
              >
                <input
                  type="radio"
                  name="color"
                  value={color}
                  required
                  defaultChecked={color === 'white'}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="mt-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-[color:var(--ink)] bg-[color:var(--paper)] peer-checked:[background:var(--ink)]"
                >
                  <span className="h-1.5 w-1.5 bg-[color:var(--paper)] opacity-0 transition-opacity duration-200 peer-checked:opacity-100" />
                </span>
                <span>
                  <span className="block font-display text-2xl font-medium capitalize text-[color:var(--ink)]">
                    {color}
                  </span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                    {color === 'white' ? 'opens with 1.e4 or 1.d4' : 'replies as second player'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </FieldLabel>

        <FieldLabel label="Description" hint="optional">
          <textarea
            name="description"
            rows={4}
            placeholder="A short note on the scope of this course."
            className={fieldClassName}
          />
        </FieldLabel>

        <div className="flex flex-wrap gap-3 pt-4">
          <PremiumButton type="submit">Create course</PremiumButton>
          <SecondaryButton href="/courses">Cancel</SecondaryButton>
        </div>
      </form>
    </AppSurface>
  );
}
