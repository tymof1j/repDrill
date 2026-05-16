'use client';

import { useState } from 'react';
import { PremiumButton, FieldLabel } from '@/components/ui/Premium';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { addCourseToRepertoireAction } from '../actions';

export function AddCourseForm({
  repertoireId,
  courses,
}: {
  repertoireId: string;
  courses: { id: string; name: string; color: 'white' | 'black' }[];
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');

  return (
    <form
      action={addCourseToRepertoireAction}
      className="grid items-end gap-4 border-t border-[color:var(--paper-rule)] px-5 py-5 md:grid-cols-[1fr_auto] md:gap-6 md:px-7"
    >
      <input type="hidden" name="repertoireId" value={repertoireId} />
      <input type="hidden" name="courseId" value={courseId} />
      <FieldLabel label="Bind another course">
        <CustomSelect
          value={courseId}
          onChange={setCourseId}
          options={courses.map((course) => ({
            value: course.id,
            label: course.name,
            description: course.color,
          }))}
        />
      </FieldLabel>
      <PremiumButton type="submit" disabled={!courseId}>
        Bind
      </PremiumButton>
    </form>
  );
}
