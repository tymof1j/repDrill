import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { createCourseAction } from '../actions';
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

export default async function NewCoursePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return (
    <AppSurface>
      <BackLink href="/courses">Courses</BackLink>
      <PageHeader
        eyebrow="New course"
        title="Create a course"
        body="Start with a named repertoire body, then import PGN chapters into it."
      />

      <PremiumPanel className="max-w-2xl">
        <form action={createCourseAction} className="space-y-6 p-6 md:p-8">
          <FieldLabel label="Name" required>
            <input name="name" required placeholder="My Grunfeld" className={fieldClassName} />
          </FieldLabel>

          <FieldLabel label="Color" required>
            <div className="grid gap-3 sm:grid-cols-2">
              {['white', 'black'].map((color) => (
                <label
                  key={color}
                  className="flex cursor-pointer items-center gap-3 rounded-[1.25rem] border border-[#f8f1df]/10 bg-[#f8f1df]/[0.06] px-4 py-3 text-sm font-semibold capitalize text-[#d8cfba]"
                >
                  <input type="radio" name="color" value={color} required defaultChecked={color === 'white'} />
                  {color}
                </label>
              ))}
            </div>
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
            <SecondaryButton href="/courses">Cancel</SecondaryButton>
          </div>
        </form>
      </PremiumPanel>
    </AppSurface>
  );
}
