import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ─── Auth ───────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  googleId: text('google_id').unique(),
  lichessUsername: text('lichess_username'),
  chesscomUsername: text('chesscom_username'),
  language: text('language', { enum: ['en', 'uk'] }).notNull().default('en'),
  emailVerified: integer('email_verified', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const accounts = sqliteTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  pk: uniqueIndex('accounts_provider_account_idx').on(table.provider, table.providerAccountId),
}));

export const sessions = sqliteTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
});

export const verificationTokens = sqliteTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  pk: uniqueIndex('verification_tokens_identifier_token_idx').on(table.identifier, table.token),
}));

// ─── Courses ────────────────────────────────────────────────────────
// A course is a single body of opening theory for one color (e.g. "My Grünfeld").
// Imported from a PGN file or Lichess study. Always tied to one color.
export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color', { enum: ['white', 'black'] }).notNull(),
  description: text('description'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  shareToken: text('share_token').unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── Repertoires ────────────────────────────────────────────────────
// A repertoire is a curated playlist across courses. Can mix colors.
// Picks specific lines or whole courses; resolves conflicts when courses overlap.
export const repertoires = sqliteTable('repertoires', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const repertoireCourses = sqliteTable('repertoire_courses', {
  id: text('id').primaryKey(),
  repertoireId: text('repertoire_id').notNull().references(() => repertoires.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  uniq: uniqueIndex('repertoire_courses_unique').on(table.repertoireId, table.courseId),
}));

// When the included courses give multiple options from the same position, the user
// picks one as the preferred move for this repertoire. Absence of a row means "no
// preference yet — show all options".
export const repertoireChoices = sqliteTable('repertoire_choices', {
  id: text('id').primaryKey(),
  repertoireId: text('repertoire_id').notNull().references(() => repertoires.id, { onDelete: 'cascade' }),
  positionId: text('position_id').notNull(),
  preferredMoveId: text('preferred_move_id').notNull(),
}, (table) => ({
  uniq: uniqueIndex('repertoire_choices_unique').on(table.repertoireId, table.positionId),
}));

// ─── Opening Tree (Graph Model) ─────────────────────────────────────
export const positions = sqliteTable('positions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fen: text('fen').notNull(),
  annotation: text('annotation'),
}, (table) => ({
  userFenIdx: uniqueIndex('positions_user_fen_idx').on(table.userId, table.fen),
}));

export const moves = sqliteTable('moves', {
  id: text('id').primaryKey(),
  chapterId: text('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  parentPositionId: text('parent_position_id').notNull().references(() => positions.id),
  childPositionId: text('child_position_id').notNull().references(() => positions.id),
  san: text('san').notNull(),
  uci: text('uci').notNull(),
  moveNumber: integer('move_number').notNull(),
  colorToMove: text('color_to_move', { enum: ['white', 'black'] }).notNull(),
  isMainLine: integer('is_main_line', { mode: 'boolean' }).notNull().default(true),
  moveType: text('move_type', { enum: ['repertoire', 'opponent', 'alternative'] }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ─── SRS / Review State ─────────────────────────────────────────────
export const reviewCards = sqliteTable('review_cards', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  moveId: text('move_id').notNull().references(() => moves.id, { onDelete: 'cascade' }),
  due: integer('due', { mode: 'timestamp' }).notNull(),
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  elapsedDays: integer('elapsed_days').notNull().default(0),
  scheduledDays: integer('scheduled_days').notNull().default(0),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  state: integer('state').notNull().default(0),
  lastReview: integer('last_review', { mode: 'timestamp' }),
});

export const reviewLogs = sqliteTable('review_logs', {
  id: text('id').primaryKey(),
  cardId: text('card_id').notNull().references(() => reviewCards.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  responseTimeMs: integer('response_time_ms'),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }).notNull(),
  prevStability: real('prev_stability'),
  prevDifficulty: real('prev_difficulty'),
  prevState: integer('prev_state'),
});

// ─── Game Analysis ──────────────────────────────────────────────────
export const analyzedGames = sqliteTable('analyzed_games', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: text('source', { enum: ['lichess', 'chesscom'] }).notNull(),
  gameId: text('game_id').notNull(),
  pgn: text('pgn').notNull(),
  playedAs: text('played_as', { enum: ['white', 'black'] }).notNull(),
  deviationMoveNumber: integer('deviation_move_number'),
  deviationPositionId: text('deviation_position_id').references(() => positions.id),
  analyzedAt: integer('analyzed_at', { mode: 'timestamp' }).notNull(),
});
