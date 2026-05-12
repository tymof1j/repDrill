import { NextResponse } from 'next/server';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/_generated/api';

export async function GET() {
  const token = await convexAuthNextjsToken();
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const courses = await fetchQuery(api.courses.list, {}, { token });
  const reviewData = await fetchQuery(api.training.exportReviewData, {}, { token });
  const positionsByFen = new Map<string, { fen: string; annotation: string | null }>();

  const courseBundles = [];
  for (const course of courses) {
    const tree = await fetchQuery(api.courses.getTree, { courseId: course._id }, { token });
    if (!tree) continue;
    for (const position of tree.positions) {
      positionsByFen.set(position.fen, {
        fen: position.fen,
        annotation: position.annotation ?? null,
      });
    }
    const positionById = new Map(tree.positions.map((position) => [position._id, position]));
    courseBundles.push({
      id: course._id,
      name: course.name,
      color: course.color,
      description: course.description ?? null,
      chapters: tree.chapters.map((chapter) => ({
        id: chapter._id,
        name: chapter.name,
        sortOrder: chapter.sortOrder,
        description: chapter.description ?? null,
        moves: tree.moves
          .filter((move) => move.chapterId === chapter._id)
          .map((move) => ({
            id: move._id,
            parentFen: positionById.get(move.parentPositionId)?.fen ?? '',
            childFen: positionById.get(move.childPositionId)?.fen ?? '',
            san: move.san,
            uci: move.uci,
            moveNumber: move.moveNumber,
            colorToMove: move.colorToMove,
            isMainLine: move.isMainLine,
            moveType: move.moveType,
            sortOrder: move.sortOrder,
          })),
      })),
    });
  }

  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    courses: courseBundles,
    positions: Array.from(positionsByFen.values()),
    reviewState: reviewData.cards.map((card) => ({
      cardId: card._id,
      moveId: card.moveId,
      due: new Date(card.due).toISOString(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsedDays,
      scheduledDays: card.scheduledDays,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      lastReview: card.lastReview ? new Date(card.lastReview).toISOString() : null,
    })),
    reviewLogs: reviewData.logs.map((log) => ({
      cardId: log.cardId,
      rating: log.rating,
      responseTimeMs: log.responseTimeMs ?? null,
      reviewedAt: new Date(log.reviewedAt).toISOString(),
      prevStability: log.prevStability ?? null,
      prevDifficulty: log.prevDifficulty ?? null,
      prevState: log.prevState ?? null,
    })),
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="repdrill-export-${stamp}.json"`,
    },
  });
}
