import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exportCourseAsPgn } from '@/lib/course/export';
import { getCourse } from '@/lib/course/queries';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const url = new URL(req.url);
  const courseId = url.searchParams.get('id');
  if (!courseId) return new NextResponse('Missing id', { status: 400 });

  const course = await getCourse(session.user.id, courseId);
  if (!course) return new NextResponse('Not found', { status: 404 });

  const pgn = await exportCourseAsPgn(session.user.id, courseId);
  const safeName = course.name.replace(/[^a-z0-9_-]+/gi, '_');
  return new NextResponse(pgn, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-chess-pgn; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}.pgn"`,
    },
  });
}
