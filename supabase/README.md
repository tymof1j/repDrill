# RepDrill Supabase migration

The migration is designed as a one-way, append-only cutover:

1. Create a Supabase project and run `migrations/0001_repdrill.sql` in the SQL editor (or with the Supabase CLI).
2. Configure WorkOS AuthKit with:
   - Sign-in endpoint: `/sign-in`
   - Callback URI: `/auth/callback`
   - Logout URI: `/`
3. For production OAuth, unlock the WorkOS Production environment by adding billing information, then create a Production API key and use the Production Client ID. Staging and Production have separate keys, users, redirect URIs, and Google connections.
4. Register exactly `https://<canonical-host>/auth/callback` and `https://<canonical-host>/` in WorkOS Production. Set `SITE_URL` to the canonical HTTPS origin and `WORKOS_REDIRECT_URI` to its `/auth/callback` URL. Do not use a Vercel preview URL for either value.
5. In WorkOS Production → Authentication → OAuth providers → Google, configure the app's Google OAuth credentials. Copy WorkOS's displayed Google redirect URI into Google Cloud Console as an authorized redirect URI, then enable Google for the Production AuthKit application. WorkOS's default Google credentials are staging-only.
6. Add `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_REDIRECT_URI`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (the same callback URL), a random `WORKOS_COOKIE_PASSWORD` of at least 32 characters, and `SUPABASE_DB_URL` to the production deployment environment. Never commit these values.
7. From a machine with access to the Convex project, create a complete snapshot:

   ```sh
   npx convex export --prod --include-file-storage --path /private/tmp/repdrill-convex.zip
   ```

8. Run the importer with the same Supabase connection string:

   ```sh
   SUPABASE_DB_URL='postgres://…' \
     node supabase/scripts/migrate-convex-to-supabase.mjs /private/tmp/repdrill-convex.zip
   ```

   Inspect the snapshot first if you want a count-only audit:

   ```sh
   node supabase/scripts/inspect-convex-snapshot.mjs /private/tmp/repdrill-convex.zip
   ```

The importer reads every table in the ZIP, preserves unknown/internal auth
documents in `public.legacy_auth_documents`, records every old-to-new ID in
`public.legacy_id_map`, and never modifies or deletes Convex data. Re-running
it is safe. The importer deliberately does not attempt to copy Convex session
credentials: WorkOS owns new sessions, while the old auth documents remain
available for audit and reconciliation.

The counter design is separate from the migration. `counter_snapshots` stores
the last computed totals and the app reads them immediately. The totals are
aggregated terminal training lines, not individual positions. A refresh is
checked every minute, but it only traverses the graph when a course was
actually reviewed after the last snapshot (or when imported course data needs
its first snapshot).

For a fully independent refresh after cutover, enable Supabase's Cron module
(`pg_cron`). Migration `0002` schedules `repdrill-counter-refresh` every
minute and runs `public.process_counter_refresh_jobs()` inside Postgres, so no
Vercel cron plan is required. If the module was not enabled when the migration
ran, enable it under Supabase → Integrations → Cron and run:

```sql
select cron.schedule(
  'repdrill-counter-refresh',
  '* * * * *',
  'select public.process_counter_refresh_jobs();'
);
```

The `/api/internal/counter-refresh` endpoint remains available for a secured
manual or external scheduler using `Authorization: Bearer $COUNTER_REFRESH_SECRET`.
