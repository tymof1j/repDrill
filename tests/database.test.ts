import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { saveProgress } from '../src/lib/training/saveProgress';
import { importBundle } from '../src/lib/import/bundle';
import { insertImportedChapter } from '../src/lib/import/chapter';
import { parsePgn } from '../src/lib/chess/pgn-parser';
import { buildTree } from '../src/lib/chess/tree';
import type { ReviewEvent } from '../src/lib/training/progress';
const url = process.env.TEST_DATABASE_URL;
const permitted = url && ['localhost', '127.0.0.1'].includes(new URL(url).hostname) && new URL(url).pathname === '/repdrill_test';
if (url && !permitted) throw new Error('Integration tests require a local, disposable database named repdrill_test');
const db = permitted ? postgres(url, { max: 4, prepare: false, onnotice: () => {} }) : undefined;
describe.skipIf(!db)('PostgreSQL integration', () => {
  beforeAll(async () => {
    for (const file of ['0001_repdrill.sql', '0002_line_based_counter_refresh.sql', '0003_reliable_training.sql', '0004_puzzle_courses.sql', '0005_consistent_line_counters.sql', '0006_bundle_import_receipts.sql']) {
      await db!.unsafe(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    }
  });
  beforeEach(async () => { await db!`truncate public.users cascade`; });
  afterAll(async () => { await db?.end(); });
  async function seed(pgn = '1. e4 e5 2. Nf3 Nc6 *') {
    const [user] = await db!`insert into users (email) values (${crypto.randomUUID() + '@example.test'}) returning *`;
    const [course] = await db!`insert into courses(user_id, name, color) values (${user.id}, 'Test course', 'white') returning *`;
    const tree = buildTree(parsePgn(pgn)[0]);
    const imported = await db!.begin(tx => insertImportedChapter(tx, user.id, course, { ...tree, chapterName: 'Test chapter' }));
    const cards = await db!`select * from review_cards where user_id = ${user.id} order by id`;
    return { user, course, cards, imported };
  }
  function review(cardId: string, overrides: Partial<ReviewEvent> = {}): ReviewEvent {
    return { id: crypto.randomUUID(), kind: 'review', cardId, correct: true, responseTimeMs: 4000, reviewedAt: Date.now(), ...overrides };
  }
  it('imports positions, comments, variations and cards in bulk', async () => {
    const { cards, imported } = await seed('1. e4 {Central space [%cal Ge2e4]} (1. d4 d5) e5 2. Nf3 Nc6 *');
    expect(imported.movesCreated).toBe(6);
    expect(cards).toHaveLength(3);
    const [move] = await db!`select comment, annotations from moves where uci = 'e2e4'`;
    expect(move.comment).toBe('Central space');
    expect(move.annotations.arrows).toHaveLength(1);
  });
  it('acknowledges retry and concurrent duplicate exactly once', async () => {
    const { user, cards } = await seed(); const event = review(cards[0].id);
    const answers = await Promise.all([saveProgress(db, user.id, [event]), saveProgress(db, user.id, [event])]);
    expect(answers[0].acknowledged).toEqual([event.id]);
    expect(await db!`select * from review_logs`).toHaveLength(1);
    const [card] = await db!`select * from review_cards where id = ${event.cardId}`;
    expect(card.reps).toBe(1);
    expect(card.learning_steps).toBeGreaterThanOrEqual(0);
    expect(card.due.getTime()).toBeGreaterThan(event.reviewedAt);
  });
  it('rolls back receipts, cards and logs together if the log write fails', async () => {
    const { user, cards } = await seed(); const event = review(cards[0].id);
    await db!`alter table review_logs add constraint force_test_failure check (rating = 99)`;
    try { await expect(saveProgress(db, user.id, [event])).rejects.toThrow(); }
    finally { await db!`alter table review_logs drop constraint force_test_failure`; }
    expect(await db!`select * from training_events`).toHaveLength(0);
    const [card] = await db!`select * from review_cards where id = ${event.cardId}`;
    expect(card.reps).toBe(0);
    await saveProgress(db, user.id, [event]);
    expect(await db!`select * from review_logs`).toHaveLength(1);
  });
  it('uses FSRS Again for failure and Hard for a slow correct answer', async () => {
    const { user, cards } = await seed();
    await saveProgress(db, user.id, [review(cards[0].id, { correct: false }), review(cards[1].id, { responseTimeMs: 20000 })]);
    const logs = await db!`select rating from review_logs order by rating`;
    expect(logs.map(row => row.rating)).toEqual([1, 2]);
  });
  it('does not rewind later progress or write another account’s cards', async () => {
    const { user, cards } = await seed(); const newer = review(cards[0].id);
    await saveProgress(db, user.id, [newer]);
    await saveProgress(db, user.id, [review(cards[0].id, { reviewedAt: newer.reviewedAt - 86_400_000, correct: false })]);
    const [other] = await db!`insert into users(email) values ('other@example.test') returning *`;
    await saveProgress(db, other.id, [review(cards[0].id)]);
    expect(await db!`select * from review_logs`).toHaveLength(1);
  });
  it('rolls back a partially imported chapter', async () => {
    const { user, course } = await seed();
    const before = await db!`select id from chapters`;
    await expect(db!.begin(async tx => {
      await insertImportedChapter(tx, user.id, course, { ...buildTree(parsePgn('1. d4 d5 *')[0]), chapterName: 'Partial' });
      throw new Error('Interrupted');
    })).rejects.toThrow('Interrupted');
    expect(await db!`select id from chapters`).toHaveLength(before.length);
  });
  it('validates the entire batch before writing any event', async () => {
    const { user, cards } = await seed();
    await expect(saveProgress(db, user.id, [review(cards[0].id), { kind: 'review' }])).rejects.toThrow();
    expect(await db!`select * from training_events`).toHaveLength(0);
  });
  it('counts partially learned lines as new and excludes information chapters', async () => {
    const { user, cards, imported } = await seed();
    await saveProgress(db, user.id, [review(cards[0].id)]);
    await db!`select refresh_counter_snapshots(${user.id})`;
    const [partial] = await db!`select * from counter_snapshots where course_id is null`;
    expect([partial.total_lines, partial.learned_lines, partial.new_lines]).toEqual([1, 0, 1]);
    await db!`delete from review_cards where id = ${cards[1].id}`;
    await db!`select refresh_counter_snapshots(${user.id})`;
    const [missing] = await db!`select * from counter_snapshots where course_id is null`;
    expect(missing.new_lines).toBe(1);
    await db!`update chapters set chapter_type = 'info_only' where id = ${imported.chapter.id}`;
    await db!`select refresh_counter_snapshots(${user.id})`;
    const [info] = await db!`select * from counter_snapshots where course_id is null`;
    expect(info.total_lines).toBe(0);
  });
  it('records puzzle attempts once without changing memory cards or global review totals', async () => {
    const { user, course, cards, imported } = await seed();
    await db!`update courses set training_mode = 'puzzles' where id = ${course.id}`;
    const event = { id: crypto.randomUUID(), kind: 'puzzle', chapterId: imported.chapter.id,
      lineKey: 'e2e4 e7e5 g1f3 b8c6', correct: true, reviewedAt: Date.now() };
    await saveProgress(db, user.id, [event, review(cards[0].id)]);
    await saveProgress(db, user.id, [event]);
    expect(await db!`select * from review_logs`).toHaveLength(0);
    const [progress] = await db!`select * from puzzle_line_progress`;
    expect([progress.attempts, progress.successes]).toEqual([1, 1]);
    await db!`select refresh_counter_snapshots(${user.id})`;
    const [snapshot] = await db!`select * from counter_snapshots where course_id = ${course.id}`;
    expect([snapshot.total_lines, snapshot.learned_lines, snapshot.due_lines]).toEqual([1, 1, 0]);
    const [global] = await db!`select * from counter_snapshots where course_id is null`;
    expect(global.total_lines).toBe(0);
  });

  it('restores archived FSRS state, logs, annotations and line settings atomically and once', async () => {
    const { user } = await seed();
    const tree = buildTree(parsePgn('1. d4 {A comment} d5 *')[0]);
    const bundle = { version: 1, positions: [], courses: [{ name: 'Restored', color: 'white', chapters: [{ id: 'ch-old', name: 'Chapter', chapterType: 'info_only', moves: tree.moves.map((m, i) => ({ ...m, id: 'm' + i, childFen: m.fen })) }] }],
      reviewState: [{ cardId: 'card-old', moveId: 'm0', due: new Date().toISOString(), stability: 5, difficulty: 3, elapsedDays: 1, scheduledDays: 3, reps: 7, lapses: 2, state: 2, learningSteps: 1, lastReview: new Date().toISOString() }],
      reviewLogs: [{ cardId: 'card-old', rating: 3, reviewedAt: new Date().toISOString() }],
      lineSettings: [{ chapter_id: 'ch-old', line_key: 'd2d4 d7d5', info_only: false }],
      infoViews: [{ chapter_id: 'ch-old', line_key: 'd2d4 d7d5', viewed_at: new Date().toISOString() }] };
    await importBundle(db, user.id, bundle);
    expect((await importBundle(db, user.id, bundle)).alreadyImported).toBe(true);
    expect(await db!`select id from courses where name = 'Restored'`).toHaveLength(1);
    const [card] = await db!`select * from review_cards where reps = 7`;
    expect(card.learning_steps).toBe(1);
    expect(await db!`select * from review_logs where card_id = ${card.id}`).toHaveLength(1);
    expect(await db!`select * from chapter_line_settings`).toHaveLength(1);
    expect(await db!`select * from info_line_views`).toHaveLength(1);
    const broken = { ...bundle, exportedAt: 'different', reviewLogs: [{ cardId: 'missing', rating: 3, reviewedAt: new Date().toISOString() }] };
    await expect(importBundle(db, user.id, broken)).rejects.toThrow('missing card');
    expect(await db!`select id from courses where name = 'Restored'`).toHaveLength(1);
  });

  it('accepts clock skew without scheduling into the future or blocking the outbox', async () => {
    const { user, cards } = await seed();
    await saveProgress(db, user.id, [review(cards[0].id, { reviewedAt: Date.now() + 3_600_000 })]);
    const [card] = await db!`select * from review_cards where id = ${cards[0].id}`;
    expect(card.last_review.getTime()).toBeLessThanOrEqual(Date.now());
    expect(card.reps).toBe(1);
  });

});
