/* eslint-disable @typescript-eslint/no-explicit-any */
import { normalizeFen } from '../chess/fen';

/** A bounded number of SQL round trips per chapter, not per move. The caller
 * supplies a transaction so a failed import never leaves half a chapter. */
export async function insertImportedChapter(db: any, userId: string, course: any, input: any) {
  const allMoves: any[] = input.moves ?? [];
  if (!allMoves.length && !input.allowEmpty) throw new Error(`Chapter “${input.chapterName ?? input.name ?? 'Chapter'}” contains no moves`);
  const positions = new Map<string, any>();
  const moves = new Map<string, any>();
  for (const [index, move] of allMoves.entries()) {
    if (!move.parentFen || !(move.fen ?? move.childFen) || !move.san || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move.uci)) {
      throw new Error(`Invalid move ${index + 1} in imported chapter`);
    }
    const parentFen = normalizeFen(move.parentFen);
    const childFen = normalizeFen(move.fen ?? move.childFen);
    positions.set(parentFen, positions.get(parentFen) ?? { user_id: userId, fen: parentFen, annotation: null });
    const previous = positions.get(childFen);
    positions.set(childFen, { user_id: userId, fen: childFen, annotation: previous?.annotation ?? move.comment ?? null });
    const turnAfter = childFen.split(' ')[1] === 'w' ? 'white' : 'black';
    const moveType = move.moveType ?? ((turnAfter === 'white' ? 'black' : 'white') === course.color ? 'repertoire' : 'opponent');
    const key = `${parentFen}:${move.uci}:${moveType}`;
    const existing = moves.get(key);
    if (existing) {
      existing.is_main_line ||= move.isMainLine ?? true;
      existing.comment ||= move.comment ?? null;
      existing.annotations ||= move.annotations ?? null;
    } else {
      moves.set(key, { parentFen, childFen, san: move.san, uci: move.uci, move_number: move.moveNumber ?? 1,
        color_to_move: turnAfter, is_main_line: move.isMainLine ?? true, move_type: moveType,
        sort_order: move.sortOrder ?? index, comment: move.comment ?? null, annotations: move.annotations ?? null });
    }
  }
  const [chapter] = await db`
    insert into public.chapters (course_id, name, chapter_type, sort_order, description, source_chapter_id, source_file)
    values (${course.id}, ${input.chapterName ?? input.name ?? 'Chapter'}, ${input.chapterType ?? 'training'}, ${input.sortOrder ?? 0}, ${input.description ?? null}, ${input.sourceChapterId ?? null}, ${input.sourceFile ?? null}) returning *
  `;
  const byFen = new Map<string, string>();
  const positionRows = [...positions.values()].sort((a, b) => a.fen.localeCompare(b.fen));
  for (let i = 0; i < positionRows.length; i += 500) {
    const inserted = await db`insert into public.positions ${db(positionRows.slice(i, i + 500))}
      on conflict (user_id, fen) do update set annotation = coalesce(public.positions.annotation, excluded.annotation)
      returning id, fen`;
    for (const row of inserted) byFen.set(row.fen, row.id);
  }
  const moveRows = [...moves.values()].map(({ parentFen, childFen, annotations, ...move }) => ({
    ...move, chapter_id: chapter.id, parent_position_id: byFen.get(parentFen), child_position_id: byFen.get(childFen),
    annotations: annotations ? db.json(annotations) : null,
  }));
  for (let i = 0; i < moveRows.length; i += 500) await db`insert into public.moves ${db(moveRows.slice(i, i + 500))}`;
  if (course.training_mode !== 'puzzles') await db`insert into public.review_cards (user_id, move_id, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state)
    select ${userId}, id, now(), 0, 0, 0, 0, 0, 0, 0 from public.moves
    where chapter_id = ${chapter.id} and move_type = 'repertoire' on conflict (user_id, move_id) do nothing`;
  return { chapter, movesCreated: moveRows.length };
}
