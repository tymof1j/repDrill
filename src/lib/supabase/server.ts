import 'server-only';

import postgres, { type Sql } from 'postgres';

let client: Sql | undefined;

export function getSupabaseDb() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL is required for Supabase server access');
  }
  client ??= postgres(connectionString, {
    // Supabase transaction poolers do not support prepared statements.
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 8,
    max_lifetime: 600,
    connection: { statement_timeout: 25_000 },
  });
  return client;
}

export async function closeSupabaseDb() {
  if (!client) return;
  await client.end({ timeout: 5 });
  client = undefined;
}
