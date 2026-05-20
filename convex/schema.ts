import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

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
    isPublic: v.boolean(),
    shareToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]).index("by_share_token", ["shareToken"]),

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
  }).index("by_chapter", ["chapterId"]).index("by_parent", ["parentPositionId"]),

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
