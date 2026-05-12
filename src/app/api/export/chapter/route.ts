import { NextResponse } from 'next/server';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';

function escapeHeader(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function renderMoveToken(
  move: { san: string; moveNumber: number; colorToMove: 'white' | 'black' },
  forceNumber: boolean,
): string {
  const justMoved = move.colorToMove === 'white' ? 'black' : 'white';
  if (justMoved === 'white') return `${move.moveNumber}. ${move.san}`;
  if (forceNumber) return `${move.moveNumber}... ${move.san}`;
  return move.san;
}

export async function GET(req: Request) {
  const token = await convexAuthNextjsToken();
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const chapterId = url.searchParams.get('id') as Id<'chapters'> | null;
  const courseId = url.searchParams.get('courseId') as Id<'courses'> | null;
  if (!chapterId || !courseId) return new NextResponse('Missing id', { status: 400 });

  const tree = await fetchQuery(api.courses.getTree, { courseId }, { token });
  const chapter = tree?.chapters.find((item) => item._id === chapterId);
  if (!tree || !chapter) return new NextResponse('Not found', { status: 404 });

  const moveRows = tree.moves.filter((move) => move.chapterId === chapter._id);
  const posById = new Map(tree.positions.map((position) => [position._id, position]));
  const byParent = new Map<string, typeof moveRows>();
  for (const move of moveRows) {
    const siblings = byParent.get(move.parentPositionId) ?? [];
    siblings.push(move);
    byParent.set(move.parentPositionId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => Number(b.isMainLine) - Number(a.isMainLine) || a.sortOrder - b.sortOrder);
  }

  function writeLine(positionId: string, isFirstMove: boolean): string {
    const children = byParent.get(positionId) ?? [];
    if (children.length === 0) return '';
    const [main, ...alts] = children;
    let out = renderMoveToken(main, isFirstMove);
    const childPos = posById.get(main.childPositionId);
    if (childPos?.annotation) out += ` {${childPos.annotation.replace(/[{}]/g, '')}}`;
    for (const alt of alts) {
      out += ' (' + renderMoveToken(alt, true);
      const tail = writeLine(alt.childPositionId, false);
      if (tail) out += ' ' + tail;
      out += ')';
    }
    const tail = writeLine(main.childPositionId, false);
    if (tail) out += ' ' + tail;
    return out;
  }

  const headers =
    `[Event "${escapeHeader(chapter.name)}"]\n` +
    `[ChapterName "${escapeHeader(chapter.name)}"]\n` +
    `[Color "${tree.course.color}"]\n` +
    `[Result "*"]\n`;
  const body = tree.rootPositionId ? writeLine(tree.rootPositionId, true) : '';

  return new NextResponse(`${headers}\n${body} *\n`, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-chess-pgn; charset=utf-8',
      'Content-Disposition': `attachment; filename="chapter-${chapterId}.pgn"`,
    },
  });
}
