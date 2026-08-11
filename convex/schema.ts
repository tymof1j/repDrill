import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// PGN annotations are kept on the move that introduced them.  Keeping these
// bounded per move avoids putting a growing list on a course/chapter document,
// while preserving Chessable drawings, NAGs and Lichess clock metadata.
const pgnArrow = v.object({
  start: v.string(),
  end: v.string(),
  color: v.optional(v.string()),
  raw: v.optional(v.string()),
});

const pgnCircle = v.object({
  square: v.string(),
  color: v.optional(v.string()),
  raw: v.optional(v.string()),
});

const pgnDirective = v.object({
  name: v.string(),
  args: v.record(v.string(), v.string()),
  value: v.optional(v.string()),
  raw: v.string(),
});

const pgnAnnotations = v.object({
  nags: v.optional(v.array(v.number())),
  directives: v.optional(v.array(pgnDirective)),
  arrows: v.optional(v.array(pgnArrow)),
  circles: v.optional(v.array(pgnCircle)),
  clocks: v.optional(v.array(v.string())),
});

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    lichessUsername: v.optional(v.string()),
    chesscomUsername: v.optional(v.string()),
    language: v.optional(v.union(v.literal('en'), v.literal('uk'))),
    lastAnalyzeSyncLichessAt: v.optional(v.number()),
    lastAnalyzeSyncChesscomAt: v.optional(v.number()),
  }).index("email", ["email"]).index("phone", ["phone"]),

  courses: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.union(v.literal('white'), v.literal('black')),
    description: v.optional(v.string()),
    sourceCourseId: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    isPublic: v.boolean(),
    shareToken: v.optional(v.string()),
    lastChapterReorderAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_and_source_course_id", ["userId", "sourceCourseId"])
    .index("by_share_token", ["shareToken"]),

  shareLinks: defineTable({
    ownerId: v.id("users"),
    resourceType: v.union(v.literal("course"), v.literal("repertoire"), v.literal("analysis")),
    resourceId: v.string(),
    scopeType: v.optional(v.union(v.literal("resource"), v.literal("course"), v.literal("chapter"), v.literal("line"))),
    scopeId: v.optional(v.string()),
    scopeLabel: v.optional(v.string()),
    token: v.optional(v.string()),
    access: v.union(v.literal("none"), v.literal("view"), v.literal("copy"), v.literal("collaborate")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_resource_type_and_resource_id", ["resourceType", "resourceId"])
    .index("by_token", ["token"])
    .index("by_owner", ["ownerId"]),

  shareInvitations: defineTable({
    ownerId: v.id("users"),
    resourceType: v.union(v.literal("course"), v.literal("repertoire"), v.literal("analysis")),
    resourceId: v.string(),
    scopeType: v.optional(v.union(v.literal("resource"), v.literal("course"), v.literal("chapter"), v.literal("line"))),
    scopeId: v.optional(v.string()),
    scopeLabel: v.optional(v.string()),
    email: v.string(),
    access: v.union(v.literal("view"), v.literal("copy"), v.literal("collaborate")),
    notify: v.boolean(),
    message: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_resource_type_and_resource_id", ["resourceType", "resourceId"])
    .index("by_email", ["email"])
    .index("by_owner", ["ownerId"]),

  chapters: defineTable({
    courseId: v.id("courses"),
    name: v.string(),
    chapterType: v.optional(v.union(v.literal("training"), v.literal("info_only"))),
    sortOrder: v.number(),
    description: v.optional(v.string()),
    sourceChapterId: v.optional(v.string()),
    sourceFile: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_course", ["courseId"]),

  chapterLineSettings: defineTable({
    chapterId: v.id("chapters"),
    lineKey: v.string(),
    infoOnly: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_chapter_and_line_key", ["chapterId", "lineKey"]).index("by_chapter", ["chapterId"]),

  infoLineViews: defineTable({
    userId: v.id("users"),
    chapterId: v.id("chapters"),
    lineKey: v.string(),
    viewedAt: v.number(),
  }).index("by_user_and_chapter_and_line_key", ["userId", "chapterId", "lineKey"]).index("by_user", ["userId"]),

  // Built-in book courses are shared application data, but every training
  // result is private to the signed-in user.  Keep the small current-cycle
  // summary separate from puzzle state and the append-only attempt history.
  bookProgress: defineTable({
    userId: v.id("users"),
    bookKey: v.union(v.literal("woodpecker-method"), v.literal("woodpecker-method-2")),
    cycle: v.number(),
    position: v.number(),
    setSize: v.number(),
    solvedCount: v.number(),
    missedCount: v.number(),
    // The legacy app can report a missed-count without exposing every queued
    // exercise id.  Preserve that count instead of fabricating puzzle ids.
    unresolvedMissedCount: v.number(),
    attemptCount: v.number(),
    startedAt: v.optional(v.number()),
    sourceMarker: v.optional(v.string()),
    lastImportedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id_and_book_key", ["userId", "bookKey"]),

  bookPuzzleProgress: defineTable({
    userId: v.id("users"),
    bookKey: v.union(v.literal("woodpecker-method"), v.literal("woodpecker-method-2")),
    cycle: v.number(),
    puzzle: v.number(),
    solved: v.boolean(),
    missed: v.boolean(),
    attemptCount: v.number(),
    bestSuccessTimeMs: v.optional(v.number()),
    lastTimeMs: v.optional(v.number()),
    lastSuccess: v.boolean(),
    lastAttemptAt: v.number(),
    sourceMarker: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id_and_book_key_and_cycle_and_puzzle", [
      "userId",
      "bookKey",
      "cycle",
      "puzzle",
    ]),

  bookPuzzleAttempts: defineTable({
    userId: v.id("users"),
    bookKey: v.union(v.literal("woodpecker-method"), v.literal("woodpecker-method-2")),
    cycle: v.number(),
    puzzle: v.number(),
    attempt: v.number(),
    success: v.boolean(),
    durationMs: v.optional(v.number()),
    recordedAt: v.number(),
    source: v.union(v.literal("native"), v.literal("legacy_import")),
    sourceMarker: v.string(),
    sourceAttemptKey: v.string(),
    importId: v.optional(v.id("bookProgressImports")),
  })
    .index("by_user_id_and_book_key_and_cycle_and_puzzle_and_attempt", [
      "userId",
      "bookKey",
      "cycle",
      "puzzle",
      "attempt",
    ])
    .index("by_user_id_and_book_key_and_source_attempt_key", [
      "userId",
      "bookKey",
      "sourceAttemptKey",
    ]),

  bookProgressImports: defineTable({
    userId: v.id("users"),
    bookKey: v.union(v.literal("woodpecker-method"), v.literal("woodpecker-method-2")),
    kind: v.union(v.literal("legacy_csv"), v.literal("local_storage")),
    sourceMarker: v.string(),
    idempotencyKey: v.string(),
    sourceRecordCount: v.number(),
    importedAttemptCount: v.number(),
    cycle: v.number(),
    position: v.number(),
    setSize: v.number(),
    solvedCount: v.number(),
    missedCount: v.number(),
    createdAt: v.number(),
    completedAt: v.number(),
  }).index("by_user_id_and_book_key_and_source_marker", ["userId", "bookKey", "sourceMarker"]),

  repertoires: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  repertoireCourses: defineTable({
    repertoireId: v.id("repertoires"),
    courseId: v.id("courses"),
    sortOrder: v.number(),
  }).index("by_repertoire", ["repertoireId"]).index("by_course", ["courseId"]),

  repertoireChoices: defineTable({
    repertoireId: v.id("repertoires"),
    positionId: v.id("positions"),
    preferredMoveId: v.id("moves"),
  }).index("by_repertoire", ["repertoireId", "positionId"]),

  positions: defineTable({
    userId: v.id("users"),
    fen: v.string(),
    annotation: v.optional(v.string()),
  }).index("by_user_fen", ["userId", "fen"]),

  moves: defineTable({
    chapterId: v.id("chapters"),
    parentPositionId: v.id("positions"),
    childPositionId: v.id("positions"),
    san: v.string(),
    uci: v.string(),
    moveNumber: v.number(),
    colorToMove: v.union(v.literal('white'), v.literal('black')),
    isMainLine: v.boolean(),
    moveType: v.union(v.literal('repertoire'), v.literal('opponent'), v.literal('alternative')),
    sortOrder: v.number(),
    // `comment` is duplicated from the child position for line-specific notes;
    // the position annotation remains the backwards-compatible search field.
    comment: v.optional(v.string()),
    annotations: v.optional(pgnAnnotations),
  }).index("by_chapter", ["chapterId"]).index("by_parent", ["parentPositionId"]),

  courseImports: defineTable({
    courseId: v.id("courses"),
    userId: v.id("users"),
    status: v.union(v.literal("queued"), v.literal("processing"), v.literal("done"), v.literal("failed")),
    totalChapters: v.number(),
    completedChapters: v.number(),
    failedChapters: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_course_and_created_at", ["courseId", "createdAt"]).index("by_user_and_created_at", ["userId", "createdAt"]),

  courseImportChapters: defineTable({
    importId: v.id("courseImports"),
    courseId: v.id("courses"),
    userId: v.id("users"),
    chapterName: v.string(),
    chapterType: v.union(v.literal("training"), v.literal("info_only")),
    sortOrder: v.number(),
    courseColor: v.union(v.literal("white"), v.literal("black")),
    rootFen: v.string(),
    sourceChapterId: v.optional(v.string()),
    sourceFile: v.optional(v.string()),
    status: v.union(v.literal("queued"), v.literal("processing"), v.literal("done"), v.literal("failed")),
    totalMoves: v.number(),
    processedMoves: v.number(),
    moveChunkCount: v.number(),
    createdChapterId: v.optional(v.id("chapters")),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_import_and_sort_order", ["importId", "sortOrder"])
    .index("by_course_and_created_at", ["courseId", "createdAt"])
    // Archive imports use source chapter ids as an idempotency key.  Keep the
    // lookup on the import child row so retries can skip chapters that have
    // already been queued even when their background work is still running.
    .index("by_course_and_source_chapter_id", ["courseId", "sourceChapterId"]),

  courseImportMoveChunks: defineTable({
    chapterImportId: v.id("courseImportChapters"),
    chunkIndex: v.number(),
    moves: v.array(
      v.object({
        parentFen: v.string(),
        fen: v.string(),
        san: v.string(),
        uci: v.string(),
        moveNumber: v.number(),
        colorToMove: v.union(v.literal("white"), v.literal("black")),
        comment: v.optional(v.string()),
        isMainLine: v.boolean(),
        annotations: v.optional(pgnAnnotations),
      }),
    ),
    createdAt: v.number(),
  }).index("by_chapter_import_and_chunk_index", ["chapterImportId", "chunkIndex"]),

  reviewCards: defineTable({
    userId: v.id("users"),
    moveId: v.id("moves"),
    due: v.number(),
    stability: v.number(),
    difficulty: v.number(),
    elapsedDays: v.number(),
    scheduledDays: v.number(),
    reps: v.number(),
    lapses: v.number(),
    state: v.number(), // 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
    lastReview: v.optional(v.number()),
  }).index("by_user_due", ["userId", "due"]).index("by_move", ["moveId"]),

  reviewLogs: defineTable({
    cardId: v.id("reviewCards"),
    rating: v.number(),
    responseTimeMs: v.optional(v.number()),
    reviewedAt: v.number(),
    prevStability: v.optional(v.number()),
    prevDifficulty: v.optional(v.number()),
    prevState: v.optional(v.number()),
  }).index("by_card", ["cardId"]),

  analyzedGames: defineTable({
    userId: v.id("users"),
    source: v.union(v.literal('lichess'), v.literal('chesscom')),
    gameId: v.string(),
    url: v.optional(v.string()),
    whiteUsername: v.string(),
    blackUsername: v.string(),
    result: v.union(v.literal('1-0'), v.literal('0-1'), v.literal('1/2-1/2'), v.literal('*')),
    playedAt: v.number(),
    opening: v.optional(v.string()),
    timeControl: v.optional(v.string()),
    pgn: v.string(),
    playedAs: v.union(v.literal('white'), v.literal('black')),
    deviationKind: v.union(
      v.literal('in_book'),
      v.literal('left_book'),
      v.literal('no_repertoire_for_color'),
      v.literal('parse_error'),
    ),
    deviationMoveNumber: v.optional(v.number()),
    deviationPly: v.optional(v.number()),
    playedSan: v.optional(v.string()),
    expectedSans: v.optional(v.array(v.string())),
    deviationFen: v.optional(v.string()),
    totalPlies: v.number(),
    deviationPositionId: v.optional(v.id("positions")),
    analyzedAt: v.number(),
    annotations: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("by_user_source", ["userId", "source"]),
});
