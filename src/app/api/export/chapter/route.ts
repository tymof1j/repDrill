import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exportChapterAsPgn } from '@/lib/course/export';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const url = new URL(req.url);
  const chapterId = url.searchParams.get('id');
  if (!chapterId) return new NextResponse('Missing id', { status: 400 });

  try {
    const pgn = await exportChapterAsPgn(session.user.id, chapterId);
    return new NextResponse(pgn, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-chess-pgn; charset=utf-8',
        'Content-Disposition': `attachment; filename="chapter-${chapterId}.pgn"`,
      },
    });
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : 'Error', { status: 404 });
  }
}
