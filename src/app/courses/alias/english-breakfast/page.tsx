import { convexAuthNextjsToken } from '@/lib/workos/convex-compat';
import { fetchQuery } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import { api } from '@/lib/supabase/api';

function normalizeCourseName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export default async function EnglishBreakfastAliasPage() {
  const token = await convexAuthNextjsToken();
  if (!token) redirect('/login');

  const courses = await fetchQuery(api.courses.list, {}, { token }).catch(() => []);
  const exact = courses.find((course) => normalizeCourseName(course.name) === 'english breakfast');
  const candidates = courses.filter((course) =>
    normalizeCourseName(course.name).includes('english breakfast'),
  );
  const course = exact ?? (candidates.length === 1 ? candidates[0] : null);

  redirect(course ? `/courses/${course._id}` : '/courses');
}
