import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const SYNC_COOLDOWN_MS = 4 * 60 * 1000;

export const getCached = query({
  args: {
    source: v.union(v.literal("lichess"), v.literal("chesscom")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { rows: [], lastSyncedAt: null as number | null };

    const limit = Math.min(50, Math.max(1, args.limit ?? 10));
    const rows = await ctx.db
      .query("analyzedGames")
      .withIndex("by_user_source", (q) => q.eq("userId", userId).eq("source", args.source))
      .order("desc")
      .take(limit);

    const user = await ctx.db.get(userId);
    const lastSyncedAt =
      args.source === "lichess"
        ? user?.lastAnalyzeSyncLichessAt ?? null
        : user?.lastAnalyzeSyncChesscomAt ?? null;

    return { rows, lastSyncedAt };
  },
});

export const storeSync = mutation({
  args: {
    source: v.union(v.literal("lichess"), v.literal("chesscom")),
    rows: v.array(
      v.object({
        gameId: v.string(),
        url: v.optional(v.string()),
        whiteUsername: v.string(),
        blackUsername: v.string(),
        result: v.union(v.literal("1-0"), v.literal("0-1"), v.literal("1/2-1/2"), v.literal("*")),
        playedAt: v.number(),
        opening: v.optional(v.string()),
        timeControl: v.optional(v.string()),
        pgn: v.string(),
        playedAs: v.union(v.literal("white"), v.literal("black")),
        deviationKind: v.union(
          v.literal("in_book"),
          v.literal("left_book"),
          v.literal("no_repertoire_for_color"),
          v.literal("parse_error"),
        ),
        deviationMoveNumber: v.optional(v.number()),
        deviationPly: v.optional(v.number()),
        playedSan: v.optional(v.string()),
        expectedSans: v.optional(v.array(v.string())),
        deviationFen: v.optional(v.string()),
        totalPlies: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const now = Date.now();
    const user = await ctx.db.get(userId);
    const lastSyncedAt =
      args.source === "lichess"
        ? user?.lastAnalyzeSyncLichessAt ?? 0
        : user?.lastAnalyzeSyncChesscomAt ?? 0;
    const nextAllowedAt = lastSyncedAt + SYNC_COOLDOWN_MS;
    if (lastSyncedAt > 0 && now < nextAllowedAt) {
      throw new Error(`Rate limited. Try again in ${Math.ceil((nextAllowedAt - now) / 1000)}s.`);
    }

    const existing = await ctx.db
      .query("analyzedGames")
      .withIndex("by_user_source", (q) => q.eq("userId", userId).eq("source", args.source))
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    for (const row of args.rows) {
      await ctx.db.insert("analyzedGames", {
        userId,
        source: args.source,
        gameId: row.gameId,
        url: row.url,
        whiteUsername: row.whiteUsername,
        blackUsername: row.blackUsername,
        result: row.result,
        playedAt: row.playedAt,
        opening: row.opening,
        timeControl: row.timeControl,
        pgn: row.pgn,
        playedAs: row.playedAs,
        deviationKind: row.deviationKind,
        deviationMoveNumber: row.deviationMoveNumber,
        deviationPly: row.deviationPly,
        playedSan: row.playedSan,
        expectedSans: row.expectedSans,
        deviationFen: row.deviationFen,
        totalPlies: row.totalPlies,
        analyzedAt: now,
      });
    }

    await ctx.db.patch(userId, {
      ...(args.source === "lichess"
        ? { lastAnalyzeSyncLichessAt: now }
        : { lastAnalyzeSyncChesscomAt: now }),
    });

    return { syncedAt: now };
  },
});
