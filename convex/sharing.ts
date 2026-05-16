import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

const resourceTypeValidator = v.union(
  v.literal("course"),
  v.literal("repertoire"),
  v.literal("analysis"),
);

const linkAccessValidator = v.union(
  v.literal("none"),
  v.literal("view"),
  v.literal("copy"),
  v.literal("collaborate"),
);

const inviteAccessValidator = v.union(
  v.literal("view"),
  v.literal("copy"),
  v.literal("collaborate"),
);

type ResourceType = "course" | "repertoire" | "analysis";
type InviteAccess = "view" | "copy" | "collaborate";
type AnyAccess = "none" | InviteAccess;

const accessRank: Record<AnyAccess, number> = {
  none: 0,
  view: 1,
  copy: 2,
  collaborate: 3,
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function strongest(a: AnyAccess, b: AnyAccess): AnyAccess {
  return accessRank[b] > accessRank[a] ? b : a;
}

function newToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

async function getOwnedResource(
  ctx: QueryCtx | MutationCtx,
  resourceType: ResourceType,
  resourceId: string,
  ownerId: Id<"users">,
) {
  if (resourceType === "course") {
    const doc = await ctx.db.get(resourceId as Id<"courses">);
    return doc && doc.userId === ownerId ? doc : null;
  }
  if (resourceType === "repertoire") {
    const doc = await ctx.db.get(resourceId as Id<"repertoires">);
    return doc && doc.userId === ownerId ? doc : null;
  }
  const doc = await ctx.db.get(resourceId as Id<"analyzedGames">);
  return doc && doc.userId === ownerId ? doc : null;
}

function resourceTitle(resource: Doc<"courses"> | Doc<"repertoires"> | Doc<"analyzedGames">, type: ResourceType) {
  if (type === "analysis") {
    const game = resource as Doc<"analyzedGames">;
    return `${game.whiteUsername} vs ${game.blackUsername}`;
  }
  return (resource as Doc<"courses"> | Doc<"repertoires">).name;
}

async function getShareLink(ctx: QueryCtx | MutationCtx, resourceType: ResourceType, resourceId: string) {
  return await ctx.db
    .query("shareLinks")
    .withIndex("by_resource_type_and_resource_id", (q) =>
      q.eq("resourceType", resourceType).eq("resourceId", resourceId),
    )
    .unique();
}

export const getSettings = query({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const resource = await getOwnedResource(ctx, args.resourceType, args.resourceId, userId);
    if (!resource) return null;

    const link = await getShareLink(ctx, args.resourceType, args.resourceId);
    const invitations = await ctx.db
      .query("shareInvitations")
      .withIndex("by_resource_type_and_resource_id", (q) =>
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId),
      )
      .take(100);
    const owner = await ctx.db.get(userId);

    return {
      title: resourceTitle(resource, args.resourceType),
      ownerName: owner?.name ?? "You",
      ownerEmail: owner?.email ?? null,
      linkAccess: link?.access ?? ("none" as const),
      token: link?.access !== "none" ? (link?.token ?? null) : null,
      invitations: invitations
        .sort((a, b) => a.email.localeCompare(b.email))
        .map((invite) => ({
          id: invite._id,
          email: invite.email,
          access: invite.access,
          notify: invite.notify,
        })),
    };
  },
});

export const setLinkAccess = mutation({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    access: linkAccessValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const resource = await getOwnedResource(ctx, args.resourceType, args.resourceId, userId);
    if (!resource) throw new Error("Not found");

    const now = Date.now();
    const existing = await getShareLink(ctx, args.resourceType, args.resourceId);
    if (existing) {
      const token = existing.token ?? newToken();
      await ctx.db.patch(existing._id, {
        access: args.access,
        token: args.access === "none" ? undefined : token,
        updatedAt: now,
      });
      return { access: args.access, token: args.access === "none" ? null : token };
    }

    const token = args.access === "none" ? undefined : newToken();
    await ctx.db.insert("shareLinks", {
      ownerId: userId,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      token,
      access: args.access,
      createdAt: now,
      updatedAt: now,
    });
    return { access: args.access, token: token ?? null };
  },
});

export const rotateLink = mutation({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const resource = await getOwnedResource(ctx, args.resourceType, args.resourceId, userId);
    if (!resource) throw new Error("Not found");

    const now = Date.now();
    const token = newToken();
    const existing = await getShareLink(ctx, args.resourceType, args.resourceId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        access: existing.access === "none" ? "view" : existing.access,
        token,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("shareLinks", {
        ownerId: userId,
        resourceType: args.resourceType,
        resourceId: args.resourceId,
        token,
        access: "view",
        createdAt: now,
        updatedAt: now,
      });
    }
    return { token };
  },
});

export const upsertInvitation = mutation({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    email: v.string(),
    access: inviteAccessValidator,
    notify: v.boolean(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const resource = await getOwnedResource(ctx, args.resourceType, args.resourceId, userId);
    if (!resource) throw new Error("Not found");

    const email = normalizeEmail(args.email);
    if (!email || !email.includes("@")) throw new Error("Enter a valid email.");

    const now = Date.now();
    const existing = await ctx.db
      .query("shareInvitations")
      .withIndex("by_resource_type_and_resource_id", (q) =>
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId),
      )
      .take(100);
    const match = existing.find((invite) => invite.email === email);
    if (match) {
      await ctx.db.patch(match._id, {
        access: args.access,
        notify: args.notify,
        message: args.message,
        updatedAt: now,
      });
      return { invitationId: match._id, title: resourceTitle(resource, args.resourceType) };
    }

    const invitationId = await ctx.db.insert("shareInvitations", {
      ownerId: userId,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      email,
      access: args.access,
      notify: args.notify,
      message: args.message,
      createdAt: now,
      updatedAt: now,
    });
    return { invitationId, title: resourceTitle(resource, args.resourceType) };
  },
});

export const removeInvitation = mutation({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const resource = await getOwnedResource(ctx, args.resourceType, args.resourceId, userId);
    if (!resource) throw new Error("Not found");

    const email = normalizeEmail(args.email);
    const invitations = await ctx.db
      .query("shareInvitations")
      .withIndex("by_resource_type_and_resource_id", (q) =>
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId),
      )
      .take(100);
    const match = invitations.find((invite) => invite.email === email);
    if (match) await ctx.db.delete(match._id);
    return { ok: true };
  },
});

export const listSharedWithMe = query({
  args: {
    resourceType: resourceTypeValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    const email = user?.email ? normalizeEmail(user.email) : null;
    if (!email) return [];

    const invitations = await ctx.db
      .query("shareInvitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(100);
    const rows = [];
    for (const invitation of invitations) {
      if (invitation.resourceType !== args.resourceType) continue;
      if (invitation.ownerId === userId) continue;
      const owner = await ctx.db.get(invitation.ownerId);
      if (args.resourceType === "course") {
        const course = await ctx.db.get(invitation.resourceId as Id<"courses">);
        if (course) rows.push({ invitation, owner, resource: course });
      } else if (args.resourceType === "repertoire") {
        const repertoire = await ctx.db.get(invitation.resourceId as Id<"repertoires">);
        if (repertoire) rows.push({ invitation, owner, resource: repertoire });
      } else {
        const game = await ctx.db.get(invitation.resourceId as Id<"analyzedGames">);
        if (game) rows.push({ invitation, owner, resource: game });
      }
    }
    return rows;
  },
});

async function getInvitationsForCurrentUser(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  const email = user?.email ? normalizeEmail(user.email) : null;
  if (!email) return [];
  const invitations = await ctx.db
    .query("shareInvitations")
    .withIndex("by_email", (q) => q.eq("email", email))
    .take(100);
  return invitations.filter((invitation) => invitation.ownerId !== userId);
}

export const listSharedCourses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const invitations = await getInvitationsForCurrentUser(ctx, userId);
    const rows = [];
    for (const invitation of invitations) {
      if (invitation.resourceType !== "course") continue;
      const owner = await ctx.db.get(invitation.ownerId);
      const resource = await ctx.db.get(invitation.resourceId as Id<"courses">);
      if (resource) rows.push({ invitation, owner, resource });
    }
    return rows;
  },
});

export const listSharedRepertoires = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const invitations = await getInvitationsForCurrentUser(ctx, userId);
    const rows = [];
    for (const invitation of invitations) {
      if (invitation.resourceType !== "repertoire") continue;
      const owner = await ctx.db.get(invitation.ownerId);
      const resource = await ctx.db.get(invitation.resourceId as Id<"repertoires">);
      if (resource) rows.push({ invitation, owner, resource });
    }
    return rows;
  },
});

export const listSharedAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const invitations = await getInvitationsForCurrentUser(ctx, userId);
    const rows = [];
    for (const invitation of invitations) {
      if (invitation.resourceType !== "analysis") continue;
      const owner = await ctx.db.get(invitation.ownerId);
      const resource = await ctx.db.get(invitation.resourceId as Id<"analyzedGames">);
      if (resource) rows.push({ invitation, owner, resource });
    }
    return rows;
  },
});

export const resolveToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!link || link.access === "none") return null;

    const userId = await getAuthUserId(ctx);
    let effectiveAccess: AnyAccess = link.access;
    if (userId) {
      const user = await ctx.db.get(userId);
      const email = user?.email ? normalizeEmail(user.email) : null;
      if (email) {
        const invitations = await ctx.db
          .query("shareInvitations")
          .withIndex("by_email", (q) => q.eq("email", email))
          .take(100);
        for (const invitation of invitations) {
          if (invitation.resourceType === link.resourceType && invitation.resourceId === link.resourceId) {
            effectiveAccess = strongest(effectiveAccess, invitation.access);
          }
        }
      }
    }

    return {
      resourceType: link.resourceType,
      resourceId: link.resourceId,
      access: effectiveAccess,
    };
  },
});
