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
    max: 5,
  });
  return client;
}

export async function closeSupabaseDb() {
  if (!client) return;
  await client.end({ timeout: 5 });
  client = undefined;
}
