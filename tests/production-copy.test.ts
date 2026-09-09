import { expect, it } from 'vitest';
import postgres from 'postgres';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildTrainingQueue } from '../src/lib/training/queue';
const url = process.env.BENCHMARK_DATABASE_URL;
if (url && (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || new URL(url).pathname !== '/repdrill_benchmark')) throw Error('Only a local repdrill_benchmark copy is permitted');
it.skipIf(!url)('preserves imported material and matches SQL counters on a production-sized copy', async () => {
  const db = postgres(url!, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const counts = () => db`select (select count(*) from courses)::int courses, (select count(*) from chapters)::int chapters, (select count(*) from moves)::int moves, (select count(*) from review_cards)::int cards`;
    const before = await counts();
    await db.begin(async tx => {
      for (const file of ['0003_reliable_training.sql', '0004_puzzle_courses.sql', '0005_consistent_line_counters.sql', '0006_bundle_import_receipts.sql']) await tx.unsafe(readFileSync('supabase/migrations/' + file, 'utf8'));
    });
    expect(await counts()).toEqual(before);
    const owners = await db`select distinct user_id from courses`;
    for (const { user_id } of owners) {
      const courses = await db`select * from courses where user_id=${user_id}`;
      const chapters = await db`select ch.* from chapters ch join courses c on c.id=ch.course_id where c.user_id=${user_id} order by sort_order,created_at`;
      const moves = await db`select m.* from moves m join chapters ch on ch.id=m.chapter_id join courses c on c.id=ch.course_id where c.user_id=${user_id}`;
      const positions = await db`select * from positions where user_id=${user_id}`;
      const cards = await db`select * from review_cards where user_id=${user_id}`;
      const settings = await db`select s.* from chapter_line_settings s join chapters ch on ch.id=s.chapter_id join courses c on c.id=ch.course_id where c.user_id=${user_id}`;
      const start = performance.now();
      const queue = buildTrainingQueue({ courses, chapters, moves, positions, cards, settings, views: [] }, { learnMode: true });
      const queueMs = performance.now() - start;
      const sqlStart = performance.now();
      await db`select refresh_counter_snapshots(${user_id})`;
      const counterMs = performance.now() - sqlStart;
      const [snapshot] = await db`select * from counter_snapshots where user_id=${user_id} and course_id is null`;
      expect([queue.totalLines, queue.newLines, queue.dueLines]).toEqual([snapshot.total_lines, snapshot.new_lines, snapshot.due_lines]);
      const report = { material: before[0], queueMs: Math.round(queueMs), counterMs: Math.round(counterMs), totalLines: queue.totalLines, dueLines: queue.dueLines, newLines: queue.newLines };
      if (process.env.BENCHMARK_REPORT_PATH) writeFileSync(process.env.BENCHMARK_REPORT_PATH, JSON.stringify(report, null, 2));
    }
  } finally { await db.end(); }
}, 60_000);
