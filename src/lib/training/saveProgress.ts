/* eslint-disable @typescript-eslint/no-explicit-any */
import { scheduleCard, Rating } from '../srs/fsrs';
import { validateProgressEvents, type ProgressEvent } from './progress';
import type { Card } from 'ts-fsrs';

/** Atomic and idempotent: a lost HTTP response can be retried without another
 * review. Card locks serialize competing devices; every batch uses ID order. */
export async function saveProgress(db: any, userId: string, input: unknown) {
  const events = validateProgressEvents(input);
  return db.begin(async (tx: any) => {
    const receipts = await tx`
      insert into public.training_events ${tx([...events].sort((a, b) => a.id.localeCompare(b.id)).map((event) => ({ user_id: userId, event_id: event.id })))}
      on conflict (user_id, event_id) do nothing returning event_id
    `;
    const fresh = new Set(receipts.map((row: any) => row.event_id));
    const pending = events.filter((event) => fresh.has(event.id)).sort((a, b) => a.reviewedAt - b.reviewedAt);
    const cardIds = [...new Set(pending.flatMap((event) => event.kind === 'review' ? [event.cardId] : []))].sort();
    const cards: any[] = cardIds.length ? await tx`
      select rc.* from public.review_cards rc
      join public.moves m on m.id = rc.move_id
      join public.chapters ch on ch.id = m.chapter_id
      join public.courses c on c.id = ch.course_id
      where rc.user_id = ${userId} and c.user_id = ${userId} and c.training_mode = 'theory'
        and rc.id in ${tx(cardIds)} order by rc.id for update of rc
    ` : [];
    const byId = new Map(cards.map((card) => [card.id, card]));
    const updates = new Map<string, any>();
    const logs: any[] = [];
    for (const event of pending) {
      if (event.kind !== 'review') continue;
      const previous = byId.get(event.cardId);
      // Deleted material must not permanently block this device's queue.
      if (!previous) continue;
      const reviewedAt = new Date(Math.min(event.reviewedAt, Date.now()));
      // Delayed offline data must never rewind a more recent review.
      if (previous.last_review && new Date(previous.last_review).getTime() > reviewedAt.getTime()) continue;
      const card: Card = {
        due: new Date(previous.due), stability: Number(previous.stability), difficulty: Number(previous.difficulty),
        elapsed_days: Number(previous.elapsed_days), scheduled_days: Number(previous.scheduled_days),
        reps: Number(previous.reps), lapses: Number(previous.lapses), state: Number(previous.state),
        learning_steps: Number(previous.learning_steps ?? 0),
        last_review: previous.last_review ? new Date(previous.last_review) : undefined,
      };
      // A slow but correct answer is Hard, never a failure. Only first recall
      // attempts reach this endpoint; guided retries do not inflate memory.
      const rating = !event.correct ? Rating.Again : event.responseTimeMs < 3000 ? Rating.Easy : event.responseTimeMs < 8000 ? Rating.Good : Rating.Hard;
      const next = scheduleCard(card, rating, reviewedAt).card;
      const row = { ...previous, ...next, due: next.due.toISOString(), last_review: next.last_review?.toISOString() };
      byId.set(event.cardId, row);
      updates.set(event.cardId, row);
      logs.push({ card_id: event.cardId, rating, response_time_ms: event.responseTimeMs, reviewed_at: reviewedAt,
        prev_stability: card.stability, prev_difficulty: card.difficulty, prev_state: card.state });
    }
    if (updates.size) {
      await tx`
        update public.review_cards as card set
          due = value.due, stability = value.stability, difficulty = value.difficulty,
          elapsed_days = value.elapsed_days, scheduled_days = value.scheduled_days,
          reps = value.reps, lapses = value.lapses, state = value.state,
          learning_steps = value.learning_steps, last_review = value.last_review
        from jsonb_to_recordset(${tx.json([...updates.values()].map((row) => ({
          id: row.id, due: row.due, stability: row.stability, difficulty: row.difficulty,
          elapsed_days: row.elapsed_days, scheduled_days: row.scheduled_days,
          reps: row.reps, lapses: row.lapses, state: row.state,
          learning_steps: row.learning_steps, last_review: row.last_review,
        })))}) as value(id uuid, due timestamptz, stability float8, difficulty float8,
          elapsed_days float8, scheduled_days float8, reps int, lapses int, state int,
          learning_steps int, last_review timestamptz)
        where card.id = value.id and card.user_id = ${userId}
      `;
      await tx`insert into public.review_logs ${tx(logs)}`;
    }
    const info = pending.filter((event): event is Extract<ProgressEvent, { kind: 'info' }> => event.kind === 'info');
    if (info.length) {
      await tx`
        insert into public.info_line_views (user_id, chapter_id, line_key, viewed_at)
        select ${userId}, ch.id, value.line_key, max(value.viewed_at)
        from jsonb_to_recordset(${tx.json(info.map((event) => ({ chapter_id: event.chapterId, line_key: event.lineKey, viewed_at: new Date(Math.min(event.reviewedAt, Date.now())).toISOString() })))})
          as value(chapter_id uuid, line_key text, viewed_at timestamptz)
        join public.chapters ch on ch.id = value.chapter_id
        join public.courses c on c.id = ch.course_id and c.user_id = ${userId}
        group by ch.id, value.line_key
        on conflict (user_id, chapter_id, line_key) do update
          set viewed_at = greatest(public.info_line_views.viewed_at, excluded.viewed_at)
      `;
    }
    const puzzles = pending.filter((event) => event.kind === 'puzzle');
    if (puzzles.length) {
      await tx`
        insert into public.puzzle_line_progress (user_id, chapter_id, line_key, attempts, successes, last_success, last_attempt_at)
        select ${userId}, ch.id, value.line_key, count(*)::int, count(*) filter (where value.correct)::int,
          (array_agg(value.correct order by value.reviewed_at desc))[1], max(value.reviewed_at)
        from jsonb_to_recordset(${tx.json(puzzles.map((event) => ({ chapter_id: event.chapterId, line_key: event.lineKey, correct: event.correct, reviewed_at: new Date(Math.min(event.reviewedAt, Date.now())).toISOString() })))})
          as value(chapter_id uuid, line_key text, correct boolean, reviewed_at timestamptz)
        join public.chapters ch on ch.id = value.chapter_id
        join public.courses c on c.id = ch.course_id and c.user_id = ${userId} and c.training_mode = 'puzzles'
        group by ch.id, value.line_key
        on conflict (user_id, chapter_id, line_key) do update set
          attempts = public.puzzle_line_progress.attempts + excluded.attempts,
          successes = public.puzzle_line_progress.successes + excluded.successes,
          last_success = case when excluded.last_attempt_at >= public.puzzle_line_progress.last_attempt_at then excluded.last_success else public.puzzle_line_progress.last_success end,
          last_attempt_at = greatest(public.puzzle_line_progress.last_attempt_at, excluded.last_attempt_at)
      `;
    }
    if (updates.size || info.length || puzzles.length) {
      await tx`insert into public.counter_refresh_jobs (user_id, requested_at, status, force_refresh)
        values (${userId}, now(), 'queued', true) on conflict (user_id) do update
        set requested_at = excluded.requested_at, status = 'queued', force_refresh = true`;
    }
    return { acknowledged: events.map((event) => event.id) };
  });
}
