import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const updateLanguage = mutation({
  args: { language: v.union(v.literal('en'), v.literal('uk')) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(userId, { language: args.language });
  },
});

export const updateAccounts = mutation({
  args: {
    lichessUsername: v.union(v.string(), v.null()),
    chesscomUsername: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(userId, {
      lichessUsername: args.lichessUsername ?? undefined,
      chesscomUsername: args.chesscomUsername ?? undefined,
    });
  },
});
