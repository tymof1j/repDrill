# Trainer reliability — September 2026

## Behavior

Move Trainer records each first recall in an account-specific browser outbox before advancing. Next line and Save & exit no longer await the database. The layout owns synchronization, so leaving the training page does not discard pending answers. Network failure retains the original event IDs for retries; a visible status distinguishes queued progress from acknowledged progress and warns when browser storage is unavailable.

The server commits event receipts, FSRS card updates and review logs together. Replayed IDs do not create another review. Card locks have consistent ordering. Delayed offline answers cannot rewind a newer review, and a client's fast clock is capped at server time. Correct but slow answers receive Hard, not Again. Shared moves are scheduled once per session; guided repetitions do not inflate memory statistics.

Courses explicitly select memorization or puzzle solving. Puzzle attempts have separate completion records and do not schedule memory cards. Information chapters remain browsable and are excluded from due review. Learn retains chapter/line order. Counters distinguish partially learned lines from fully learned ones, count missing legacy cards as new, respect information overrides, and refresh when time makes cards due.

Share dialogs fetch settings only when opened. Closing restores focus without scrolling; mounting a library no longer focuses the final card.

PGN imports use bounded bulk inserts inside a transaction and a retry identifier. Invalid games reject the import with feedback instead of silently dropping material. Prose brackets, arrows, escaped headers and headerless consecutive games are preserved; malformed headers/comments/variations fail rather than hang. Import size is limited to 3.5 MB before the configured 4 MB action boundary.

JSON course archive restores are atomic and deduplicated by archive fingerprint. They restore FSRS state, review history, chapter types, move drawings/comments and line progress, remapping archive references to newly created rows. Existing course progress is not overwritten.

## Verification

On 2026-09-09:

- 31 unit/component/database regression tests passed, covering pending saves, duplicate requests, transaction rollback, account isolation, focus, puzzles, import restoration and clock skew.
- An additional opt-in test restored the private production backup into local PostgreSQL and applied migrations 0003–0006. Counts remained 5 courses, 308 chapters, 12,134 moves and 6,108 cards. SQL and application totals matched: 825 trainable lines, 821 new and 50 due at test time. New and due can overlap for partially learned lines.
- That local run built the queue in 38 ms and refreshed SQL snapshots in 1,074 ms. These are local computation measurements, not production HTTP latency guarantees.
- Production build, TypeScript and focused ESLint checks passed.
- The old production library's focus/scroll defect was reproduced in the signed-in browser. Full browser verification of the new deployed version remains outstanding. Local WorkOS login rejected the unregistered localhost callback.

Run normal tests with `pnpm test`. Database tests are skipped unless `TEST_DATABASE_URL` points to loopback PostgreSQL and the disposable database `repdrill_test`; these tests truncate its application data. Create roles `anon` and `authenticated` for the migration fixtures. Run the production-copy test only with `BENCHMARK_DATABASE_URL` pointing to a restored local database named `repdrill_benchmark`. It applies migrations and recomputes counters; it never permits a remote database.

## Deployment order

1. Make and verify a private database backup. An existing pre-change public-schema backup is stored in the ignored `data/import/reliability-backup-2026-09-07/` directory; refresh it before an eventual production rollout.
2. Apply migrations 0003–0006 in numeric order, in one transaction. They add columns/tables/indexes and replace counter computation without deleting courses, moves or progress. These migrations have only been applied to local test copies so far.
3. Deploy the application. Keep the canonical WorkOS callback unchanged. For local development, register `http://localhost:3000/auth/callback` in the appropriate development WorkOS environment.
4. Check that the Supabase `repdrill-counter-refresh` cron job is active and that queued jobs finish. Recompute snapshots once with `select public.process_counter_refresh_jobs();` if needed.
5. Verify login lands at the library top; train several lines with slow/offline network; return to the library and reload; reconnect and confirm pending progress disappears and each answer has one review log. Test import errors and puzzle mode on disposable material.

Application rollback can keep the additive schema. Do not remove event receipts or pending browser records during rollback; they protect retry safety.

## Hosting and remaining limits

`vercel.json` selects Dublin (`dub1`) to match this project's Supabase region. Self-hosters using another database region should adjust it. This uses one function region, supported by Vercel Hobby. PostgreSQL connections are bounded to three per instance, disable prepared statements for transaction pooling, and have idle/connect/statement timeouts. No paid service was added.

The live database measured 78 MB before these changes. Supabase's documented Free database allowance is 500 MB; this does not guarantee other account quotas, usage or future storage growth. References: [Vercel regions](https://vercel.com/docs/functions/configuring-functions/region), [Supabase database size](https://supabase.com/docs/guides/platform/database-size).

A loaded session can queue answers without connectivity; this is not a fully offline application shell. Browser storage clearing can remove unsynchronized progress. Built-in Woodpecker training has a separate existing persistence system; the course JSON archive is not a complete backup of those book cycles, account settings, repertoires or analyzed games. Production rollout and post-deployment browser validation remain separate unfinished steps.
