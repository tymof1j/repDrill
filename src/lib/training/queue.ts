function finiteMinimum(values: number[]) {
  const minimum = Math.min(...values);
  return Number.isFinite(minimum) ? minimum : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function isUnseenCard(card: any) {
  return !card || (Number(card.state) === 0 && !card.last_review);
}

function chapterRoots(moves: any[]) {
  const parents = new Set(moves.map((move) => String(move.parent_position_id)));
  const children = new Set(moves.map((move) => String(move.child_position_id)));
  const roots = [...parents].filter((id) => !children.has(id));
  return roots.length ? roots : (moves[0] ? [String(moves[0].parent_position_id)] : []);
}

export function buildTrainingQueue(data: {
  courses: any[]; chapters: any[]; moves: any[]; positions: any[];
  cards: any[]; settings: any[]; views: any[]; puzzleProgress?: any[];
}, args: Record<string, unknown> = {}, now = Date.now()) {
  const { courses, chapters, moves, positions, cards, settings, views } = data;
  const posById = new Map<string, any>(positions.map((position) => [String(position.id), position]));
  const cardByMoveId = new Map<string, any>(cards.map((card) => [String(card.move_id), card]));
  const dueCardIds = new Set(cards.filter((card) => !isUnseenCard(card) && new Date(card.due).getTime() <= now).map((card) => String(card.id)));
  const settingByKey = new Map(settings.map((setting) => [`${setting.chapter_id}:${setting.line_key}`, Boolean(setting.info_only)]));
  const solved = new Set((data.puzzleProgress ?? []).filter((entry) => entry.successes > 0).map((entry) => `${entry.chapter_id}:${entry.line_key}`));
  const viewed = new Set(views.map((view) => `${view.chapter_id}:${view.line_key}`));
  const courseById = new Map<string, any>(courses.map((course: any) => [String(course.id), course] as [string, any]));
  const chapterMoves = new Map<string, any[]>();
  for (const move of moves) {
    const list = chapterMoves.get(String(move.chapter_id)) ?? [];
    list.push(move);
    chapterMoves.set(String(move.chapter_id), list);
  }
  for (const list of chapterMoves.values()) list.sort((a, b) => Number(b.is_main_line) - Number(a.is_main_line) || Number(a.sort_order) - Number(b.sort_order));
  const extracted: any[] = [];
  let totalLines = 0;
  let dueLines = 0;
  let newLines = 0;
  for (const chapter of chapters) {
    const list = chapterMoves.get(String(chapter.id)) ?? [];
    const byParent = new Map<string, any[]>();
    for (const move of list) {
      const siblings = byParent.get(String(move.parent_position_id)) ?? [];
      siblings.push(move);
      byParent.set(String(move.parent_position_id), siblings);
    }
    const rawLines: any[][] = [];
    const onPath = new Set<string>();
    const walk = (positionId: string, path: any[]) => {
      if (onPath.has(positionId)) {
        if (path.length) rawLines.push([...path]);
        return;
      }
      onPath.add(positionId);
      const children = byParent.get(positionId) ?? [];
      if (!children.length) {
        if (path.length) rawLines.push([...path]);
        onPath.delete(positionId);
        return;
      }
      for (const move of children) {
        path.push(move);
        walk(String(move.child_position_id), path);
        path.pop();
      }
      onPath.delete(positionId);
    };
    for (const root of chapterRoots(list)) walk(root, []);
    const course = courseById.get(String(chapter.course_id));
    if (!course) continue;
    rawLines.forEach((rawMoves, lineIndex) => {
      const isPuzzle = course.training_mode === 'puzzles';
      const rootFen = posById.get(String(rawMoves[0]?.parent_position_id))?.fen;
      const puzzleColor = rootFen?.split(' ')[1] === 'b' ? 'black' : 'white';
      let selected = rawMoves;
      if (args.fromPositionId) {
        const start = rawMoves.findIndex((move) => String(move.parent_position_id) === String(args.fromPositionId));
        if (start < 0) return;
        selected = rawMoves.slice(start);
      }
      const lineKey = rawMoves.map((move) => move.uci).join(' ');
      const infoOnly = settingByKey.get(`${chapter.id}:${lineKey}`) ?? (chapter.chapter_type === 'info_only');
      const steps = selected.map((move) => {
        const parent = posById.get(String(move.parent_position_id));
        const child = posById.get(String(move.child_position_id));
        const userMove = isPuzzle ? (move.color_to_move === 'white' ? 'black' : 'white') === puzzleColor : move.move_type === 'repertoire';
        const card = !isPuzzle && userMove ? cardByMoveId.get(String(move.id)) : null;
        return {
          san: move.san,
          uci: move.uci,
          parentFen: parent?.fen ?? '',
          childFen: child?.fen ?? '',
          parentPositionId: String(move.parent_position_id),
          childPositionId: String(move.child_position_id),
          moveNumber: move.move_number,
          isUserMove: userMove,
          annotation: move.comment?.trim() || child?.annotation || null,
          annotations: move.annotations ?? null,
          cardId: card?.id ?? null,
          isNew: !isPuzzle && userMove && Boolean(isUnseenCard(card)),
        };
      });
      if (!steps.some((step) => step.isUserMove) && !infoOnly) return;
      if (!args.learnMode && infoOnly) return;
      if (infoOnly && viewed.has(`${chapter.id}:${lineKey}`) && !args.learnMode) return;
      const lineIsNew = steps.some((step) => step.isNew);
      const dueCount = steps.filter((step) => {
        return step.cardId ? dueCardIds.has(String(step.cardId)) : false;
      }).length;
      if (!infoOnly) {
        totalLines++;
        if (lineIsNew) newLines++;
        if (dueCount > 0) dueLines++;
      }
      if (!isPuzzle && !args.learnMode && !args.fromPositionId && dueCount === 0) return;
      extracted.push({
        lineId: `${chapter.id}-${lineIndex}`,
        courseId: String(chapter.course_id),
        chapterId: String(chapter.id),
        chapterSortOrder: chapter.sort_order,
        chapterLineIndex: lineIndex,
        lineKey,
        courseName: course.name,
        courseColor: isPuzzle ? puzzleColor : course.color,
        trainingMode: isPuzzle ? 'puzzles' : 'theory',
        puzzleSolved: isPuzzle && solved.has(`${chapter.id}:${lineKey}`),
        chapterName: chapter.name,
        steps,
        isNew: infoOnly ? false : lineIsNew,
        dueCount: infoOnly ? 0 : dueCount,
        nextReviewAt: finiteMinimum(selected.filter((move) => move.move_type === 'repertoire').map((move) => cardByMoveId.get(String(move.id))).filter((card) => card && !isUnseenCard(card)).map((card) => new Date(card.due).getTime())),
        isInfoOnly: infoOnly,
      });
    });
  }
  if (!args.learnMode) extracted.sort((a, b) => a.trainingMode === 'puzzles' && b.trainingMode === 'puzzles' ? Number(a.puzzleSolved) - Number(b.puzzleSolved) : (a.isNew !== b.isNew ? Number(a.isNew) - Number(b.isNew) : b.dueCount - a.dueCount));
  const limit = args.learnMode ? Number.POSITIVE_INFINITY : Math.max(0, Math.min(100, Number(args.newLineLimit ?? 5)));
  let seenNew = 0;
  const lines = extracted.filter((line) => !line.isNew || ++seenNew <= limit);
  return { lines, totalLines, dueLines, newLines };
}
