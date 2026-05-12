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

async function fetchCourseTree(courseId: Id<'courses'>, token: string) {
  return fetchQuery(api.courses.getTree, { courseId }, { token });
}

type Tree = NonNullable<Awaited<ReturnType<typeof fetchCourseTree>>>;

function pgnForChapter(tree: Tree, chapterId: string): string {
  const chapter = tree.chapters.find((item) => item._id === chapterId);
  if (!chapter) throw new Error('Chapter not found');

  const moveRows = tree.moves.filter((move) => move.chapterId === chapter._id);
  if (moveRows.length === 0) {
    return `[Event "${escapeHeader(chapter.name)}"]\n[Result "*"]\n\n*\n`;
  }

  const posById = new Map(tree.positions.map((position) => [position._id, position]));
  const rootPositionId = tree.rootPositionId;
  if (!rootPositionId) {
    return `[Event "${escapeHeader(chapter.name)}"]\n[Result "*"]\n\n*\n`;
  }

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
      const altChild = posById.get(alt.childPositionId);
      if (altChild?.annotation) out += ` {${altChild.annotation.replace(/[{}]/g, '')}}`;
      const tail = writeLine(alt.childPositionId, false);
      if (tail) out += ' ' + tail;
      out += ')';
    }
    const tail = writeLine(main.childPositionId, false);
    if (tail) out += ' ' + tail;
    return out;
  }

  const body = writeLine(rootPositionId, true);
  const headers =
    `[Event "${escapeHeader(chapter.name)}"]\n` +
    `[ChapterName "${escapeHeader(chapter.name)}"]\n` +
    `[Color "${tree.course.color}"]\n` +
    `[Result "*"]\n`;

  return `${headers}\n${body} *\n`;
}

export async function GET(req: Request) {
  const token = await convexAuthNextjsToken();
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const courseId = url.searchParams.get('id') as Id<'courses'> | null;
  if (!courseId) return new NextResponse('Missing id', { status: 400 });

  const tree = await fetchCourseTree(courseId, token);
  if (!tree) return new NextResponse('Not found', { status: 404 });

  const pgn = tree.chapters.map((chapter) => pgnForChapter(tree, chapter._id)).join('\n\n');
  const safeName = tree.course.name.replace(/[^a-z0-9_-]+/gi, '_');
  return new NextResponse(pgn, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-chess-pgn; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}.pgn"`,
    },
  });
}
