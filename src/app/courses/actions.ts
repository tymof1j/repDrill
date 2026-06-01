'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { parsePgn } from '@/lib/chess/pgn-parser';
import { buildTree } from '@/lib/chess/tree';
import type { PgnMoveNode } from '@/lib/chess/pgn-parser';

const INFO_HINT_WORDS = ['idea', 'ideas', 'game', 'games'];

function looksLikeInfoContent(value: string | undefined) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return INFO_HINT_WORDS.some((word) => lower.includes(word));
}

function filenameWithoutExt(name: string) {
  return name.replace(/\.[^.]+$/, '').trim();
}

function gameContainsInfoHints(nodes: PgnMoveNode[]): boolean {
  for (const node of nodes) {
    if (looksLikeInfoContent(node.comment)) return true;
    for (const variation of node.variations) {
      if (gameContainsInfoHints(variation)) return true;
    }
  }
  return false;
}

async function requireToken() {
  const token = await convexAuthNextjsToken();
  if (!token) redirect('/login');
  return token;
}

export async function createCourseAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const name = String(formData.get('name') ?? '').trim();
  const color = String(formData.get('color') ?? '') as 'white' | 'black';
  const description = String(formData.get('description') ?? '').trim() || undefined;

  if (!name) throw new Error('Name is required');
  if (color !== 'white' && color !== 'black') throw new Error('Color must be white or black');

  const id = await fetchMutation(api.courses.create, { name, color, description }, { token });
  revalidatePath('/courses');
  redirect(`/courses/${id}`);
}

export async function deleteCourseAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"courses">;
  if (!id) throw new Error('Missing id');

  await fetchMutation(api.courses.remove, { id }, { token });
  revalidatePath('/courses');
  redirect('/courses');
}

export async function importPgnAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const courseId = String(formData.get('courseId') ?? '') as Id<"courses">;
  const pgnText = String(formData.get('pgn') ?? '').trim();
  const sourceFiles = String(formData.get('sourceFiles') ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const fallbackFilename = sourceFiles.length === 1 ? filenameWithoutExt(sourceFiles[0]) : '';
  if (!courseId) throw new Error('Missing courseId');
  if (!pgnText) throw new Error('Paste a PGN');

  const course = await fetchQuery(api.courses.get, { id: courseId }, { token });
  if (!course) throw new Error('Course not found');

  const games = parsePgn(pgnText);
  if (games.length === 0) throw new Error('No games found in PGN');

  const chapters: Array<{
    chapterName: string;
    chapterType: 'training' | 'info_only';
    sortOrder: number;
    courseColor: 'white' | 'black';
    rootFen: string;
    moves: Array<{
      parentFen: string;
      fen: string;
      san: string;
      uci: string;
      moveNumber: number;
      colorToMove: 'white' | 'black';
      comment?: string;
      isMainLine: boolean;
    }>;
  }> = [];

  let invalidGames = 0;
  for (const [i, game] of games.entries()) {
    const chapterNameFromHeaders =
      game.headers.ChapterName ||
      game.headers.Event ||
      game.headers.White;
    const chapterName =
      chapterNameFromHeaders && chapterNameFromHeaders !== '?'
        ? chapterNameFromHeaders
        : fallbackFilename || `Chapter ${i + 1}`;
    const chapterType: 'training' | 'info_only' = looksLikeInfoContent(fallbackFilename) ||
      Object.values(game.headers).some((value) => looksLikeInfoContent(value))
      || gameContainsInfoHints(game.moves)
      ? 'info_only'
      : 'training';

    try {
      const tree = buildTree(game);
      chapters.push({
        chapterName,
        chapterType,
        sortOrder: i,
        courseColor: course.color,
        rootFen: tree.rootFen,
        moves: tree.moves.map((m) => ({
          parentFen: m.parentFen,
          fen: m.fen,
          san: m.san,
          uci: m.uci,
          moveNumber: m.moveNumber,
          colorToMove: m.colorToMove,
          comment: m.comment,
          isMainLine: m.isMainLine,
        })),
      });
    } catch (error) {
      invalidGames++;
      console.warn('[PGN import] skipped invalid game', {
        index: i,
        chapterName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (chapters.length === 0) {
    throw new Error('No valid games found in PGN. At least one game contains invalid SAN/move order.');
  }
  if (invalidGames > 0) {
    console.warn(`[PGN import] skipped ${invalidGames} invalid game(s), importing ${chapters.length} valid game(s).`);
  }

  await fetchMutation(api.import.createCourseImport, { courseId, chapters }, { token });

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

export async function renameCourseAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"courses">;
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) throw new Error('Missing id or name');

  await fetchMutation(api.courses.rename, { id, name }, { token });
  revalidatePath(`/courses/${id}`);
  revalidatePath('/courses');
}

export async function renameChapterAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"chapters">;
  const courseId = String(formData.get('courseId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) throw new Error('Missing id or name');

  await fetchMutation(api.courses.renameChapter, { id, name }, { token });
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteChapterAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"chapters">;
  const courseId = String(formData.get('courseId') ?? '');
  if (!id) throw new Error('Missing id');

  await fetchMutation(api.courses.deleteChapter, { id }, { token });
  revalidatePath(`/courses/${courseId}`);
}

export async function reorderChaptersAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const courseId = String(formData.get('courseId') ?? '') as Id<'courses'>;
  const chapterIdsRaw = String(formData.get('chapterIds') ?? '').trim();
  if (!courseId || !chapterIdsRaw) throw new Error('Missing courseId or chapterIds');

  const chapterIds = JSON.parse(chapterIdsRaw) as Id<'chapters'>[];
  if (!Array.isArray(chapterIds) || chapterIds.length === 0) throw new Error('Invalid chapterIds');

  await fetchMutation(api.courses.reorderChapters, { courseId, chapterIds }, { token });
  revalidatePath(`/courses/${courseId}`);
}

export async function setChapterTypeAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const id = String(formData.get('id') ?? '') as Id<"chapters">;
  const courseId = String(formData.get('courseId') ?? '');
  const chapterType = String(formData.get('chapterType') ?? '') as 'training' | 'info_only';
  if (!id || (chapterType !== 'training' && chapterType !== 'info_only')) throw new Error('Missing id or chapterType');

  await fetchMutation(api.courses.setChapterType, { id, chapterType }, { token });
  revalidatePath(`/courses/${courseId}`);
}

export async function setLineInfoOnlyAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const courseId = String(formData.get('courseId') ?? '');
  const chapterId = String(formData.get('chapterId') ?? '') as Id<"chapters">;
  const lineIndex = Number(formData.get('lineIndex') ?? -1);
  const infoOnly = String(formData.get('infoOnly') ?? '') === 'true';
  if (!chapterId || !Number.isFinite(lineIndex) || lineIndex < 0) throw new Error('Invalid line target');

  await fetchMutation(api.courses.setLineInfoOnly, { chapterId, lineIndex, infoOnly }, { token });
  revalidatePath(`/courses/${courseId}`);
}

export async function setSharingAction(formData: FormData): Promise<{ token: string | null; isPublic: boolean }> {
  const token = await requireToken();
  const courseId = String(formData.get('courseId') ?? '') as Id<"courses">;
  const intent = String(formData.get('intent') ?? '') as 'enable' | 'disable' | 'rotate';
  if (!courseId) throw new Error('Missing courseId');

  const result = await fetchMutation(api.courses.setSharing, { courseId, intent }, { token });
  revalidatePath(`/courses/${courseId}`);
  return { token: result.token ?? null, isPublic: result.isPublic };
}

export async function copySharedCourseAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const shareToken = String(formData.get('shareToken') ?? '');
  const newName = String(formData.get('newName') ?? '').trim();
  if (!shareToken || !newName) throw new Error('Missing shared course or name');

  const data = await fetchQuery(api.courses.getPublicByToken, { token: shareToken });
  if (!data || data.access === 'view') throw new Error('This link does not allow copying.');

  const chapterTrees = await Promise.all(
    data.chapters.map((chapter) =>
      fetchQuery(api.courses.getPublicChapterTree, { token: shareToken, chapterId: chapter._id }),
    ),
  );

  const positionsById = new Map<string, { fen: string; annotation?: string }>();
  for (const tree of chapterTrees) {
    for (const position of tree?.positions ?? []) {
      positionsById.set(position._id, {
        fen: position.fen,
        annotation: position.annotation,
      });
    }
  }
  const visibleMoveIds =
    data.scopeType === 'line' && data.scopeId
      ? (() => {
          const allMoves = chapterTrees.flatMap((tree) => tree?.moves ?? []);
          const childIds = new Set(allMoves.map((move) => String(move.childPositionId)));
          const root =
            Array.from(positionsById.entries()).find(([, position]) => position.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -')?.[0] ??
            Array.from(positionsById.keys()).find((id) => !childIds.has(id));
          const byParent = new Map<string, typeof allMoves>();
          for (const move of allMoves) {
            const siblings = byParent.get(move.parentPositionId) ?? [];
            siblings.push(move);
            byParent.set(move.parentPositionId, siblings);
          }
          const pathIds = new Set<string>();
          const visit = (positionId: string, seen: Set<string>): boolean => {
            if (positionId === data.scopeId) return true;
            if (seen.has(positionId)) return false;
            seen.add(positionId);
            for (const move of byParent.get(positionId) ?? []) {
              if (visit(move.childPositionId, new Set(seen))) {
                pathIds.add(move._id);
                return true;
              }
            }
            return false;
          };
          if (root) visit(root, new Set());
          return pathIds;
        })()
      : null;

  await fetchMutation(
    api.import.importBundle,
    {
      bundle: {
        version: 1,
        positions: Array.from(positionsById.values()),
        courses: [
          {
            name: newName,
            color: data.course.color,
            description: data.course.description,
            chapters: data.chapters.map((chapter, chapterIndex) => {
              const tree = chapterTrees[chapterIndex];
              return {
                name: chapter.name,
                sortOrder: chapter.sortOrder,
                description: chapter.description,
                moves: (tree?.moves ?? []).flatMap((move) => {
                  if (visibleMoveIds && !visibleMoveIds.has(move._id)) return [];
                  const parent = positionsById.get(move.parentPositionId);
                  const child = positionsById.get(move.childPositionId);
                  if (!parent || !child) return [];
                  return [
                    {
                      parentFen: parent.fen,
                      childFen: child.fen,
                      san: move.san,
                      uci: move.uci,
                      moveNumber: move.moveNumber,
                      colorToMove: move.colorToMove,
                      isMainLine: move.isMainLine,
                      moveType: move.moveType,
                      sortOrder: move.sortOrder,
                    },
                  ];
                }),
              };
            }),
          },
        ],
      },
    },
    { token },
  );
  revalidatePath('/courses');
  redirect('/courses');
}

export async function updateAnnotationAction(formData: FormData): Promise<void> {
  const token = await requireToken();
  const courseId = String(formData.get('courseId') ?? '') as Id<"courses">;
  const positionId = String(formData.get('positionId') ?? '') as Id<"positions">;
  const text = String(formData.get('text') ?? '');
  if (!positionId) throw new Error('Missing positionId');

  await fetchMutation(
    api.courses.updateAnnotation,
    { positionId, text: text || '', courseId: courseId || undefined },
    { token },
  );
  revalidatePath(courseId ? `/courses/${courseId}` : '/courses');
}
