#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Import a Convex snapshot ZIP into the Supabase schema.
 *
 * Usage:
 *   node supabase/scripts/migrate-convex-to-supabase.mjs snapshot.zip
 *
 * The script is intentionally append-only and resumable. It preserves every
 * unrecognised Convex table/document in legacy_auth_documents and writes the
 * old -> new ID map before inserting dependent rows. It never deletes from
 * Convex and never clears Supabase tables.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const zipPath = process.argv[2];
if (!zipPath || !existsSync(zipPath)) {
  console.error('Usage: node supabase/scripts/migrate-convex-to-supabase.mjs <snapshot.zip>');
  process.exit(1);
}

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('SUPABASE_DB_URL must point to the Supabase Postgres connection pooler.');
  process.exit(1);
}

const extractionDir = mkdtempSync(join(tmpdir(), 'repdrill-convex-'));
execFileSync('unzip', ['-q', zipPath, '-d', extractionDir], { stdio: 'inherit' });

const client = postgres(databaseUrl, {
  // Supabase transaction poolers do not support prepared statements.
  prepare: false,
  max: 1,
  connect_timeout: 15,
  idle_timeout: 30,
  connection: { application_name: 'repdrill-convex-import' },
});
let db = client;
const storage = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).storage
  : null;

const tableOrder = [
  'users',
  'courses',
  'chapters',
  'positions',
  'repertoires',
  'shareLinks',
  'shareInvitations',
  'chapterLineSettings',
  'infoLineViews',
  'bookProgress',
  'bookPuzzleProgress',
  'bookPuzzleAttempts',
  'bookProgressImports',
  'repertoireCourses',
  'moves',
  'courseImports',
  'courseImportChapters',
  'courseImportMoveChunks',
  'repertoireChoices',
  'reviewCards',
  'reviewLogs',
  'analyzedGames',
];

const tableDefinitions = {
  courses: {
    target: 'courses',
    columns: ['user_id', 'name', 'color', 'description', 'source_course_id', 'source_url', 'is_public', 'share_token', 'last_chapter_reorder_at', 'created_at', 'updated_at'],
    values: (d, map) => [map('users', d.userId), d.name, d.color, d.description ?? null, d.sourceCourseId ?? null, d.sourceUrl ?? null, d.isPublic ?? false, d.shareToken ?? null, date(d.lastChapterReorderAt), date(d._creationTime), date(d.updatedAt ?? d._creationTime)],
  },
  shareLinks: {
    target: 'share_links',
    columns: ['owner_id', 'resource_type', 'resource_id', 'scope_type', 'scope_id', 'scope_label', 'token', 'access', 'created_at', 'updated_at'],
    values: (d, map) => [map('users', d.ownerId), d.resourceType, map(resourceTable(d.resourceType), d.resourceId), d.scopeType ?? null, mapScope(d, map), d.scopeLabel ?? null, d.token ?? null, d.access, date(d.createdAt), date(d.updatedAt ?? d.createdAt)],
  },
  shareInvitations: {
    target: 'share_invitations',
    columns: ['owner_id', 'resource_type', 'resource_id', 'scope_type', 'scope_id', 'scope_label', 'email', 'access', 'notify', 'message', 'created_at', 'updated_at'],
    values: (d, map) => [map('users', d.ownerId), d.resourceType, map(resourceTable(d.resourceType), d.resourceId), d.scopeType ?? null, mapScope(d, map), d.scopeLabel ?? null, d.email, d.access, d.notify ?? true, d.message ?? null, date(d.createdAt), date(d.updatedAt ?? d.createdAt)],
  },
  chapters: {
    target: 'chapters',
    columns: ['course_id', 'name', 'chapter_type', 'sort_order', 'description', 'source_chapter_id', 'source_file', 'created_at'],
    values: (d, map) => [map('courses', d.courseId), d.name, d.chapterType ?? 'training', d.sortOrder ?? 0, d.description ?? null, d.sourceChapterId ?? null, d.sourceFile ?? null, date(d._creationTime)],
  },
  chapterLineSettings: {
    target: 'chapter_line_settings',
    columns: ['chapter_id', 'source_chapter_id', 'line_key', 'info_only', 'created_at', 'updated_at'],
    values: async (d, map) => [await mapOptionalId('chapters', d.chapterId), d.chapterId ?? null, d.lineKey, d.infoOnly ?? false, date(d.createdAt), date(d.updatedAt ?? d.createdAt)],
  },
  infoLineViews: {
    target: 'info_line_views',
    columns: ['user_id', 'chapter_id', 'line_key', 'viewed_at'],
    values: (d, map) => [map('users', d.userId), map('chapters', d.chapterId), d.lineKey, date(d.viewedAt)],
  },
  bookProgress: {
    target: 'book_progress',
    columns: ['user_id', 'book_key', 'cycle', 'position', 'set_size', 'solved_count', 'missed_count', 'unresolved_missed_count', 'attempt_count', 'started_at', 'source_marker', 'last_imported_at', 'created_at', 'updated_at'],
    values: (d, map) => [map('users', d.userId), d.bookKey, d.cycle, d.position, d.setSize, d.solvedCount ?? 0, d.missedCount ?? 0, d.unresolvedMissedCount ?? 0, d.attemptCount ?? 0, date(d.startedAt), d.sourceMarker ?? null, date(d.lastImportedAt), date(d.createdAt), date(d.updatedAt ?? d.createdAt)],
  },
  bookPuzzleProgress: {
    target: 'book_puzzle_progress',
    columns: ['user_id', 'book_key', 'cycle', 'puzzle', 'solved', 'missed', 'attempt_count', 'best_success_time_ms', 'last_time_ms', 'last_success', 'last_attempt_at', 'source_marker', 'created_at', 'updated_at'],
    values: (d, map) => [map('users', d.userId), d.bookKey, d.cycle, d.puzzle, d.solved ?? false, d.missed ?? false, d.attemptCount ?? 0, d.bestSuccessTimeMs ?? null, d.lastTimeMs ?? null, d.lastSuccess ?? false, date(d.lastAttemptAt), d.sourceMarker, date(d.createdAt), date(d.updatedAt ?? d.createdAt)],
  },
  bookPuzzleAttempts: {
    target: 'book_puzzle_attempts',
    columns: ['user_id', 'book_key', 'cycle', 'puzzle', 'attempt', 'success', 'duration_ms', 'recorded_at', 'source', 'source_marker', 'source_attempt_key', 'import_id'],
    values: (d, map) => [map('users', d.userId), d.bookKey, d.cycle, d.puzzle, d.attempt, d.success, d.durationMs ?? null, date(d.recordedAt), d.source ?? 'native', d.sourceMarker, d.sourceAttemptKey, d.importId ? map('bookProgressImports', d.importId) : null],
  },
  bookProgressImports: {
    target: 'book_progress_imports',
    columns: ['user_id', 'book_key', 'kind', 'source_marker', 'idempotency_key', 'source_record_count', 'imported_attempt_count', 'cycle', 'position', 'set_size', 'solved_count', 'missed_count', 'created_at', 'completed_at'],
    values: (d, map) => [map('users', d.userId), d.bookKey, d.kind, d.sourceMarker, d.idempotencyKey, d.sourceRecordCount, d.importedAttemptCount, d.cycle, d.position, d.setSize, d.solvedCount, d.missedCount, date(d.createdAt), date(d.completedAt)],
  },
  repertoires: {
    target: 'repertoires',
    columns: ['user_id', 'name', 'description', 'created_at', 'updated_at'],
    values: (d, map) => [map('users', d.userId), d.name, d.description ?? null, date(d.createdAt), date(d.updatedAt ?? d.createdAt)],
  },
  positions: {
    target: 'positions',
    columns: ['user_id', 'fen', 'annotation'],
    values: (d, map) => [map('users', d.userId), d.fen, d.annotation ?? null],
  },
  repertoireCourses: {
    target: 'repertoire_courses',
    columns: ['repertoire_id', 'course_id', 'sort_order'],
    values: (d, map) => [map('repertoires', d.repertoireId), map('courses', d.courseId), d.sortOrder ?? 0],
  },
  moves: {
    target: 'moves',
    columns: ['chapter_id', 'parent_position_id', 'child_position_id', 'san', 'uci', 'move_number', 'color_to_move', 'is_main_line', 'move_type', 'sort_order', 'comment', 'annotations'],
    values: (d, map) => [map('chapters', d.chapterId), map('positions', d.parentPositionId), map('positions', d.childPositionId), d.san, d.uci, d.moveNumber, d.colorToMove, d.isMainLine ?? false, d.moveType, d.sortOrder ?? 0, d.comment ?? null, d.annotations ?? null],
  },
  courseImports: {
    target: 'course_imports',
    columns: ['course_id', 'source_course_id', 'user_id', 'status', 'total_chapters', 'completed_chapters', 'failed_chapters', 'created_at', 'updated_at'],
    values: async (d, map) => [await mapOptionalId('courses', d.courseId), d.courseId ?? null, map('users', d.userId), d.status, d.totalChapters, d.completedChapters ?? 0, d.failedChapters ?? 0, date(d.createdAt), date(d.updatedAt ?? d.createdAt)],
  },
  courseImportChapters: {
    target: 'course_import_chapters',
    columns: ['import_id', 'course_id', 'source_course_id', 'user_id', 'chapter_name', 'chapter_type', 'sort_order', 'course_color', 'root_fen', 'source_chapter_id', 'source_file', 'status', 'total_moves', 'processed_moves', 'move_chunk_count', 'created_chapter_id', 'error', 'created_at', 'updated_at'],
    values: async (d, map) => [map('courseImports', d.importId), await mapOptionalId('courses', d.courseId), d.courseId ?? null, map('users', d.userId), d.chapterName, d.chapterType, d.sortOrder, d.courseColor, d.rootFen, d.sourceChapterId ?? null, d.sourceFile ?? null, d.status, d.totalMoves, d.processedMoves ?? 0, d.moveChunkCount ?? 0, d.createdChapterId ? await mapOptionalId('chapters', d.createdChapterId) : null, d.error ?? null, date(d.createdAt), date(d.updatedAt ?? d.createdAt)],
  },
  courseImportMoveChunks: {
    target: 'course_import_move_chunks',
    columns: ['chapter_import_id', 'chunk_index', 'moves', 'created_at'],
    values: (d, map) => [map('courseImportChapters', d.chapterImportId), d.chunkIndex, d.moves, date(d.createdAt)],
  },
  repertoireChoices: {
    target: 'repertoire_choices',
    columns: ['repertoire_id', 'position_id', 'preferred_move_id'],
    values: (d, map) => [map('repertoires', d.repertoireId), map('positions', d.positionId), map('moves', d.preferredMoveId)],
  },
  reviewCards: {
    target: 'review_cards',
    columns: ['user_id', 'move_id', 'due', 'stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'reps', 'lapses', 'state', 'last_review'],
    values: (d, map) => [map('users', d.userId), map('moves', d.moveId), date(d.due), d.stability, d.difficulty, d.elapsedDays, d.scheduledDays, d.reps, d.lapses, d.state, date(d.lastReview)],
  },
  reviewLogs: {
    target: 'review_logs',
    columns: ['card_id', 'rating', 'response_time_ms', 'reviewed_at', 'prev_stability', 'prev_difficulty', 'prev_state'],
    values: (d, map) => [map('reviewCards', d.cardId), d.rating, d.responseTimeMs ?? null, date(d.reviewedAt), d.prevStability ?? null, d.prevDifficulty ?? null, d.prevState ?? null],
  },
  analyzedGames: {
    target: 'analyzed_games',
    columns: ['user_id', 'source', 'game_id', 'url', 'white_username', 'black_username', 'result', 'played_at', 'opening', 'time_control', 'pgn', 'played_as', 'deviation_kind', 'deviation_move_number', 'deviation_ply', 'played_san', 'expected_sans', 'deviation_fen', 'total_plies', 'deviation_position_id', 'analyzed_at', 'annotations'],
    values: (d, map) => [map('users', d.userId), d.source, d.gameId, d.url ?? null, d.whiteUsername, d.blackUsername, d.result, date(d.playedAt), d.opening ?? null, d.timeControl ?? null, d.pgn, d.playedAs, d.deviationKind, d.deviationMoveNumber ?? null, d.deviationPly ?? null, d.playedSan ?? null, d.expectedSans ?? null, d.deviationFen ?? null, d.totalPlies, d.deviationPositionId ? map('positions', d.deviationPositionId) : null, date(d.analyzedAt), d.annotations ?? null],
  },
};

function date(value) {
  if (value === undefined || value === null) return null;
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return new Date(typeof number === 'number' ? number : number);
}

function normalizePostgresValue(value) {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(normalizePostgresValue);
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalizePostgresValue(nested)]));
  }
  return value;
}

function resourceTable(resourceType) {
  if (resourceType === 'course') return 'courses';
  if (resourceType === 'repertoire') return 'repertoires';
  if (resourceType === 'analysis') return 'analyzedGames';
  throw new Error(`Unknown shared resource type: ${resourceType}`);
}

function mapScope(document, map) {
  if (!document.scopeId || document.scopeType === 'line') return document.scopeId ?? null;
  if (document.scopeType === 'course') return map('courses', document.scopeId);
  if (document.scopeType === 'chapter') return map('chapters', document.scopeId);
  if (document.scopeType === 'resource') return map(resourceTable(document.resourceType), document.scopeId);
  return document.scopeId;
}

function readTable(root, table) {
  const path = join(root, table, 'documents.jsonl');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const tableDirs = readdirSync(extractionDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const allTables = [...new Set([...tableOrder, ...tableDirs])].filter((table) => table !== '_storage');
const legacyToNew = new Map();
const snapshotIdsByTable = new Map(
  allTables.map((table) => [table, new Set(readTable(extractionDir, table).map((document) => document._id))]),
);
const INSERT_BATCH_SIZE = 500;

async function insertBatches(target, rows, columns, conflictColumn = 'legacy_id') {
  for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + INSERT_BATCH_SIZE);
    await db`
      insert into ${db(`public.${target}`)} ${db(batch, columns)}
      on conflict (${db(conflictColumn)}) do nothing
    `;
  }
}

async function rememberMaps(table, mappings) {
  if (mappings.length === 0) return;
  for (let offset = 0; offset < mappings.length; offset += INSERT_BATCH_SIZE) {
    const batch = mappings.slice(offset, offset + INSERT_BATCH_SIZE);
    await db`
      insert into public.legacy_id_map ${db(batch, ['source_table', 'source_id', 'destination_id'])}
      on conflict (source_table, source_id) do nothing
    `;
  }
  for (const mapping of mappings) {
    legacyToNew.set(`${mapping.source_table}:${mapping.source_id}`, mapping.destination_id);
  }
}

async function preloadMappings() {
  const mappings = await db`
    select source_table, source_id, destination_id
    from public.legacy_id_map
  `;
  for (const mapping of mappings) {
    legacyToNew.set(`${mapping.source_table}:${mapping.source_id}`, mapping.destination_id);
  }
}

async function existingMap(table, oldId) {
  const rows = await db`
    select destination_id from public.legacy_id_map
    where source_table = ${table} and source_id = ${oldId}
  `;
  return rows[0]?.destination_id ?? null;
}

async function rememberMap(table, oldId, newId) {
  await db`
    insert into public.legacy_id_map (source_table, source_id, destination_id)
    values (${table}, ${oldId}, ${newId})
    on conflict (source_table, source_id) do nothing
  `;
  legacyToNew.set(`${table}:${oldId}`, newId);
}

async function mapId(table, oldId) {
  if (!oldId) throw new Error(`Missing ${table} reference during import`);
  const key = `${table}:${oldId}`;
  if (legacyToNew.has(key)) return legacyToNew.get(key);
  const sourceIds = snapshotIdsByTable.get(table);
  if (sourceIds && !sourceIds.has(oldId)) {
    throw new Error(`Missing imported ${table} row for ${oldId}`);
  }
  const found = await existingMap(table, oldId);
  if (!found) throw new Error(`Missing imported ${table} row for ${oldId}`);
  legacyToNew.set(key, found);
  return found;
}

async function mapOptionalId(table, oldId) {
  if (!oldId) return null;
  const key = `${table}:${oldId}`;
  if (legacyToNew.has(key)) return legacyToNew.get(key);
  const sourceIds = snapshotIdsByTable.get(table);
  if (sourceIds && !sourceIds.has(oldId)) {
    legacyToNew.set(key, null);
    return null;
  }
  const found = await existingMap(table, oldId);
  // Cache misses too: migration snapshots can contain thousands of rows
  // referring to a course/chapter that was deleted in Convex.
  legacyToNew.set(key, found ?? null);
  return found;
}

async function ensureImportCompatibility() {
  // Convex can retain line settings after their chapter was deleted. Keep
  // those settings and their original chapter id without inventing a chapter.
  await client`
    alter table if exists public.chapter_line_settings
      add column if not exists source_chapter_id text
  `;
  await client`
    alter table if exists public.chapter_line_settings
      alter column chapter_id drop not null
  `;
  await client`
    alter table if exists public.course_imports
      add column if not exists source_course_id text
  `;
  await client`
    alter table if exists public.course_imports
      alter column course_id drop not null
  `;
  await client`
    alter table if exists public.course_import_chapters
      add column if not exists source_course_id text
  `;
  await client`
    alter table if exists public.course_import_chapters
      alter column course_id drop not null
  `;
}

async function insertUser(document) {
  const oldId = document._id;
  const already = await existingMap('users', oldId);
  if (already) return rememberMap('users', oldId, already);
  const rows = await db`
    insert into public.users (legacy_convex_id, name, image, email, email_verification_time, phone, phone_verification_time, is_anonymous, lichess_username, chesscom_username, language, last_analyze_sync_lichess_at, last_analyze_sync_chesscom_at, created_at, updated_at)
    values (${oldId}, ${document.name ?? null}, ${document.image ?? null}, ${document.email ?? null}, ${date(document.emailVerificationTime)}, ${document.phone ?? null}, ${date(document.phoneVerificationTime)}, ${document.isAnonymous ?? false}, ${document.lichessUsername ?? null}, ${document.chesscomUsername ?? null}, ${document.language ?? 'en'}, ${date(document.lastAnalyzeSyncLichessAt)}, ${date(document.lastAnalyzeSyncChesscomAt)}, ${date(document._creationTime)}, ${date(document._creationTime)})
    on conflict (legacy_convex_id) do nothing
    returning id
  `;
  const destinationId = rows[0]?.id ?? (await db`
    select id from public.users where legacy_convex_id = ${oldId}
  `)[0]?.id;
  if (!destinationId) throw new Error(`Unable to insert users:${oldId}`);
  return rememberMap('users', oldId, destinationId);
}

async function importUsers(documents) {
  const rows = documents.map((document) => ({
    legacy_convex_id: document._id,
    name: document.name ?? null,
    image: document.image ?? null,
    email: document.email ?? null,
    email_verification_time: date(document.emailVerificationTime),
    phone: document.phone ?? null,
    phone_verification_time: date(document.phoneVerificationTime),
    is_anonymous: document.isAnonymous ?? false,
    lichess_username: document.lichessUsername ?? null,
    chesscom_username: document.chesscomUsername ?? null,
    language: document.language ?? 'en',
    last_analyze_sync_lichess_at: date(document.lastAnalyzeSyncLichessAt),
    last_analyze_sync_chesscom_at: date(document.lastAnalyzeSyncChesscomAt),
    created_at: date(document._creationTime),
    updated_at: date(document._creationTime),
  }));
  await insertBatches('users', rows, Object.keys(rows[0]), 'legacy_convex_id');
  const oldIds = documents.map((document) => document._id);
  const imported = await db`
    select legacy_convex_id as legacy_id, id
    from public.users
    where legacy_convex_id in ${db(oldIds)}
  `;
  await rememberMaps('users', imported.map((row) => ({
    source_table: 'users',
    source_id: row.legacy_id,
    destination_id: row.id,
  })));
}

async function clearStaleImporterSessions() {
  const cleanup = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    connect_timeout: 15,
    connection: { application_name: 'repdrill-convex-cleanup' },
  });
  try {
    const sessions = await cleanup`
      select pid
      from pg_stat_activity
      where pid <> pg_backend_pid()
        and usename = current_user
        and datname = current_database()
        and state = 'idle in transaction'
        and (
          query ilike '%legacy_id_map%'
          or query ilike '%course_import_move_chunks%'
          or query ilike '%course_import_chapters%'
          or query ilike '%chapter_line_settings%'
        )
    `;
    for (const session of sessions) {
      await cleanup`select pg_terminate_backend(${session.pid})`;
    }
    if (sessions.length) console.log(`Cleared ${sessions.length} stale migration database session(s).`);
  } finally {
    await cleanup.end({ timeout: 5 });
  }
}

async function insertMapped(table, document, definition) {
  const oldId = document._id;
  const oldDestination = await existingMap(table, oldId);
  if (oldDestination) return rememberMap(table, oldId, oldDestination);
  const values = definition.values(document, (refTable, refId) => mapId(refTable, refId));
  const resolved = [];
  for (const value of values) {
    const resolvedValue = value instanceof Promise ? await value : value;
    // Convex documents can omit optional fields. The postgres client rejects
    // `undefined`, including when it is nested in a JSON value, while SQL
    // represents an omitted optional value as NULL.
    resolved.push(normalizePostgresValue(resolvedValue));
  }
  const columns = ['legacy_id', ...definition.columns];
  const data = [oldId, ...resolved];
  const row = Object.fromEntries(columns.map((column, index) => [column, data[index]]));
  const undefinedColumns = columns.filter((column) => row[column] === undefined);
  if (undefinedColumns.length) {
    throw new Error(`Undefined values for ${table}:${oldId}: ${undefinedColumns.join(', ')}`);
  }
  let rows;
  try {
    rows = await db`
      insert into ${db(`public.${definition.target}`)} ${db(row, columns)}
      on conflict (legacy_id) do nothing
      returning id
    `;
  } catch (error) {
    throw new Error(`Failed to import ${table}:${oldId} into ${definition.target}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  if (rows[0]?.id) return rememberMap(table, oldId, rows[0].id);
  const existing = await db`
    select id from ${db(`public.${definition.target}`)} where legacy_id = ${oldId}
  `;
  if (!existing[0]?.id) throw new Error(`Unable to insert ${table}:${oldId}`);
  return rememberMap(table, oldId, existing[0].id);
}

async function importMappedTable(table, documents, definition) {
  const rows = [];
  for (const document of documents) {
    const values = await definition.values(document, (refTable, refId) => mapId(refTable, refId));
    const resolved = [];
    for (const value of values) {
      const resolvedValue = value instanceof Promise ? await value : value;
      resolved.push(normalizePostgresValue(resolvedValue));
    }
    const columns = ['legacy_id', ...definition.columns];
    const data = [document._id, ...resolved];
    const row = Object.fromEntries(columns.map((column, index) => [column, data[index]]));
    const undefinedColumns = columns.filter((column) => row[column] === undefined);
    if (undefinedColumns.length) {
      throw new Error(`Undefined values for ${table}:${document._id}: ${undefinedColumns.join(', ')}`);
    }
    rows.push(row);
  }
  if (rows.length === 0) return;
  const columns = ['legacy_id', ...definition.columns];
  await insertBatches(definition.target, rows, columns);
  const oldIds = documents.map((document) => document._id);
  const imported = await db`
    select legacy_id, id
    from ${db(`public.${definition.target}`)}
    where legacy_id in ${db(oldIds)}
  `;
  await rememberMaps(table, imported.map((row) => ({
    source_table: table,
    source_id: row.legacy_id,
    destination_id: row.id,
  })));
}

async function preserveUnknown(table, document) {
  await db`
    insert into public.legacy_auth_documents (source_table, source_id, payload)
    values (${table}, ${document._id}, ${normalizePostgresValue(document)})
    on conflict (source_table, source_id) do nothing
  `;
}

async function importStorage() {
  const documents = readTable(extractionDir, '_storage');
  if (documents.length === 0) return 0;
  for (const document of documents) {
    const storageId = document._id;
    const filePath = join(extractionDir, '_storage', storageId);
    const hasBytes = existsSync(filePath) && statSync(filePath).isFile();
    if (storage && hasBytes) {
      const { error: bucketError } = await storage.createBucket('repdrill-legacy', { public: false });
      if (bucketError && !/already exists/i.test(bucketError.message)) throw bucketError;
      const { error } = await storage.from('repdrill-legacy').upload(storageId, readFileSync(filePath), {
        contentType: document.contentType ?? 'application/octet-stream',
        upsert: true,
      });
      if (error) throw error;
    }
    await db`
      insert into public.legacy_storage_documents (storage_id, content_type, size_bytes, object_path, payload)
      values (${storageId}, ${document.contentType ?? null}, ${hasBytes ? statSync(filePath).size : null}, ${hasBytes ? `repdrill-legacy/${storageId}` : null}, ${normalizePostgresValue(document)})
      on conflict (storage_id) do nothing
    `;
  }
  return documents.length;
}

async function importTable(table) {
  const documents = readTable(extractionDir, table);
  if (documents.length === 0) return 0;
  if (table === 'users') {
    await importUsers(documents);
    return documents.length;
  }
  const definition = tableDefinitions[table];
  if (!definition) {
    for (const document of documents) await preserveUnknown(table, document);
    return documents.length;
  }
  await importMappedTable(table, documents, definition);
  return documents.length;
}

try {
  let imported = 0;
  await clearStaleImporterSessions();
  // Commit each source table independently. A single transaction for the
  // entire snapshot can outlive Supavisor's connection lifetime; table-level
  // commits keep the import resumable and prevent a late rollback.
  for (const table of allTables) {
    const count = await client.begin(async (transaction) => {
      db = transaction;
      await preloadMappings();
      return importTable(table);
    });
    if (count) console.log(`${table}: ${count}`);
    imported += count;
  }
  const storageCount = await client.begin(async (transaction) => {
    db = transaction;
    return importStorage();
  });
  if (storageCount) console.log(`_storage: ${storageCount}`);
  imported += storageCount;
  await client.begin(async (transaction) => {
    const users = await transaction`select id from public.users`;
    for (const user of users) {
      await transaction`select public.refresh_counter_snapshots(${user.id})`;
    }
  });
  console.log(`Imported ${imported} Convex documents. Source data was not modified.`);
} finally {
  rmSync(extractionDir, { recursive: true, force: true });
  await client.end({ timeout: 5 });
}
