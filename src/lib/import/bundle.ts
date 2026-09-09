/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from 'node:crypto';
import { insertImportedChapter } from './chapter';
import { normalizeFen } from '../chess/fen';

/** Restore into new courses atomically. Original IDs only map references inside
 * this archive; they never authorize writes to an existing account's rows. */
export async function importBundle(db: any, userId: string, bundle: any) {
  if (!bundle || bundle.version !== 1 || !Array.isArray(bundle.courses)) throw new Error('Unsupported bundle');
  const fingerprint = createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
  return db.begin(async (tx: any) => {
    // Same archive retried after a lost response must not duplicate courses.
    const inserted = await tx`insert into public.bundle_import_receipts(user_id, fingerprint)
      values (${userId}, ${fingerprint}) on conflict do nothing returning fingerprint`;
    if (!inserted.length) {
      const [existing] = await tx`select summary from public.bundle_import_receipts where user_id = ${userId} and fingerprint = ${fingerprint}`;
      return { ...existing.summary, alreadyImported: true };
    }
    const summary = { coursesCreated: 0, chaptersCreated: 0, movesCreated: 0, cardsCreated: 0 };
    const moveIds = new Map<string, string>();
    const chapterIds = new Map<string, string>();
    for (const input of bundle.courses) {
      if (!input?.name || !['white', 'black'].includes(input.color) || !Array.isArray(input.chapters)) throw new Error('Invalid course in archive');
      const [course] = await tx`insert into public.courses(user_id, name, color, description, training_mode, source_course_id, source_url)
        values (${userId}, ${input.name}, ${input.color}, ${input.description ?? null}, ${input.trainingMode ?? 'theory'}, ${input.sourceCourseId ?? null}, ${input.sourceUrl ?? null}) returning *`;
      summary.coursesCreated++;
      for (const [index, chapter] of input.chapters.entries()) {
        const result = await insertImportedChapter(tx, userId, course, { ...chapter, chapterName: chapter.name, sortOrder: chapter.sortOrder ?? index, allowEmpty: true });
        summary.chaptersCreated++;
        summary.movesCreated += result.movesCreated;
        if (chapter.id) chapterIds.set(chapter.id, result.chapter.id);
        const rows = await tx`select m.id, m.uci, m.move_type, p.fen from public.moves m
          join public.positions p on p.id = m.parent_position_id where m.chapter_id = ${result.chapter.id}`;
        const mapped = new Map(rows.map((m: any) => [`${m.fen}:${m.uci}:${m.move_type}`, m.id]));
        for (const move of chapter.moves ?? []) {
          const turnAfter = normalizeFen(move.childFen).split(' ')[1] === 'w' ? 'white' : 'black';
          const type = move.moveType ?? ((turnAfter === 'white' ? 'black' : 'white') === course.color ? 'repertoire' : 'opponent');
          const id = mapped.get(`${normalizeFen(move.parentFen)}:${move.uci}:${type}`);
          if (move.id && id) moveIds.set(move.id, String(id));
        }
      }
    }
    const positions = (bundle.positions ?? []).map((p: any) => ({ user_id: userId, fen: normalizeFen(p.fen), annotation: p.annotation ?? null }));
    const uniquePositions = [...new Map(positions.map((p: any) => [p.fen, p])).values()];
    for (let i = 0; i < uniquePositions.length; i += 500) await tx`insert into public.positions ${tx(uniquePositions.slice(i, i + 500))}
      on conflict(user_id, fen) do update set annotation = coalesce(public.positions.annotation, excluded.annotation)`;
    const cardMap = new Map<string, string>();
    const states = (bundle.reviewState ?? []).map((card: any) => {
      const moveId = moveIds.get(card.moveId);
      if (!moveId) throw new Error('Review state references a missing move');
      const id = crypto.randomUUID(); cardMap.set(card.cardId, id);
      return { id, user_id: userId, move_id: moveId, due: new Date(card.due), stability: card.stability,
        difficulty: card.difficulty, elapsed_days: card.elapsedDays, scheduled_days: card.scheduledDays,
        reps: card.reps, lapses: card.lapses, state: card.state, learning_steps: card.learningSteps ?? 0,
        last_review: card.lastReview ? new Date(card.lastReview) : null };
    });
    // Defaults created during import belong only to newly created moves.
    const restoredMoves = states.map((s: any) => s.move_id);
    if (restoredMoves.length) await tx`delete from public.review_cards where user_id = ${userId} and move_id in ${tx(restoredMoves)}`;
    for (let i = 0; i < states.length; i += 500) await tx`insert into public.review_cards ${tx(states.slice(i, i + 500))}`;
    summary.cardsCreated = states.length;
    const logs = (bundle.reviewLogs ?? []).map((log: any) => {
      const cardId = cardMap.get(log.cardId);
      if (!cardId) throw new Error('Review history references a missing card');
      return { card_id: cardId, rating: log.rating, response_time_ms: log.responseTimeMs ?? null,
        reviewed_at: new Date(log.reviewedAt), prev_stability: log.prevStability ?? null,
        prev_difficulty: log.prevDifficulty ?? null, prev_state: log.prevState ?? null };
    });
    for (let i = 0; i < logs.length; i += 500) await tx`insert into public.review_logs ${tx(logs.slice(i, i + 500))}`;
    for (const [key, table] of [['lineSettings', 'chapter_line_settings'], ['infoViews', 'info_line_views'], ['puzzleProgress', 'puzzle_line_progress']] as const) {
      const rows = (bundle[key] ?? []).map((row: any) => {
        const chapterId = chapterIds.get(row.chapter_id);
        if (!chapterId) throw new Error('Line progress references a missing chapter');
        const common = { chapter_id: chapterId, line_key: row.line_key };
        if (key === 'lineSettings') return { ...common, info_only: row.info_only };
        if (key === 'infoViews') return { ...common, user_id: userId, viewed_at: new Date(row.viewed_at) };
        return { ...common, user_id: userId, attempts: row.attempts, successes: row.successes, last_success: row.last_success, last_attempt_at: new Date(row.last_attempt_at) };
      });
      for (let i = 0; i < rows.length; i += 500) await tx`insert into ${tx('public.' + table)} ${tx(rows.slice(i, i + 500))}`;
    }
    await tx`update public.bundle_import_receipts set summary = ${tx.json(summary)} where user_id = ${userId} and fingerprint = ${fingerprint}`;
    await tx`insert into public.counter_refresh_jobs(user_id, requested_at, status, force_refresh)
      values (${userId}, now(), 'queued', true) on conflict(user_id) do update set requested_at = now(), status = 'queued', force_refresh = true`;
    return summary;
  });
}
