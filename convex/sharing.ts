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

const shareScopeTypeValidator = v.optional(
  v.union(v.literal("resource"), v.literal("chapter"), v.literal("line")),
);

type ResourceType = "course" | "repertoire" | "analysis";
type ShareScopeType = "resource" | "chapter" | "line";
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

function sameScope(
  doc: { scopeType?: ShareScopeType; scopeId?: string },
  scopeType?: ShareScopeType,
  scopeId?: string,
) {
  return (doc.scopeType ?? "resource") === (scopeType ?? "resource") && (doc.scopeId ?? "") === (scopeId ?? "");
}

async function getShareLink(
  ctx: QueryCtx | MutationCtx,
  resourceType: ResourceType,
  resourceId: string,
  scopeType?: ShareScopeType,
  scopeId?: string,
) {
  const links = await ctx.db
    .query("shareLinks")
    .withIndex("by_resource_type_and_resource_id", (q) =>
      q.eq("resourceType", resourceType).eq("resourceId", resourceId),
    )
    .take(100);
  return links.find((link) => sameScope(link, scopeType, scopeId)) ?? null;
}

export const getSettings = query({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    scopeType: shareScopeTypeValidator,
    scopeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const resource = await getOwnedResource(ctx, args.resourceType, args.resourceId, userId);
    if (!resource) return null;

    const link = await getShareLink(ctx, args.resourceType, args.resourceId, args.scopeType, args.scopeId);
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
        .filter((invite) => sameScope(invite, args.scopeType, args.scopeId))
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
    scopeType: shareScopeTypeValidator,
    scopeId: v.optional(v.string()),
    scopeLabel: v.optional(v.string()),
    access: linkAccessValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const resource = await getOwnedResource(ctx, args.resourceType, args.resourceId, userId);
    if (!resource) throw new Error("Not found");

    const now = Date.now();
    const existing = await getShareLink(ctx, args.resourceType, args.resourceId, args.scopeType, args.scopeId);
    if (existing) {
      const token = existing.token ?? newToken();
      await ctx.db.patch(existing._id, {
        access: args.access,
        scopeType: args.scopeType ?? "resource",
        scopeId: args.scopeId,
        scopeLabel: args.scopeLabel,
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
      scopeType: args.scopeType ?? "resource",
      scopeId: args.scopeId,
      scopeLabel: args.scopeLabel,
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
    scopeType: shareScopeTypeValidator,
    scopeId: v.optional(v.string()),
    scopeLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const resource = await getOwnedResource(ctx, args.resourceType, args.resourceId, userId);
    if (!resource) throw new Error("Not found");

    const now = Date.now();
    const token = newToken();
    const existing = await getShareLink(ctx, args.resourceType, args.resourceId, args.scopeType, args.scopeId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        access: existing.access === "none" ? "view" : existing.access,
        scopeType: args.scopeType ?? "resource",
        scopeId: args.scopeId,
        scopeLabel: args.scopeLabel,
        token,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("shareLinks", {
        ownerId: userId,
        resourceType: args.resourceType,
        resourceId: args.resourceId,
        scopeType: args.scopeType ?? "resource",
        scopeId: args.scopeId,
        scopeLabel: args.scopeLabel,
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
    scopeType: shareScopeTypeValidator,
    scopeId: v.optional(v.string()),
    scopeLabel: v.optional(v.string()),
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
    const match = existing.find((invite) => invite.email === email && sameScope(invite, args.scopeType, args.scopeId));
    if (match) {
      await ctx.db.patch(match._id, {
        access: args.access,
        scopeType: args.scopeType ?? "resource",
        scopeId: args.scopeId,
        scopeLabel: args.scopeLabel,
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
      scopeType: args.scopeType ?? "resource",
      scopeId: args.scopeId,
      scopeLabel: args.scopeLabel,
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
    scopeType: shareScopeTypeValidator,
    scopeId: v.optional(v.string()),
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
    const match = invitations.find((invite) => invite.email === email && sameScope(invite, args.scopeType, args.scopeId));
    if (match) await ctx.db.delete(match._id);
    return { ok: true };
  },
});

export const transferOwnership = mutation({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) throw new Error("Unauthorized");
    const resource = await getOwnedResource(ctx, args.resourceType, args.resourceId, ownerId);
    if (!resource) throw new Error("Not found");

    const email = normalizeEmail(args.email);
    const target = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!target) throw new Error("The new owner must sign in once before ownership can be transferred.");
    if (target._id === ownerId) throw new Error("You already own this item.");

    if (args.resourceType === "course") {
      const courseId = args.resourceId as Id<"courses">;
      const chapters = await ctx.db
        .query("chapters")
        .withIndex("by_course", (q) => q.eq("courseId", courseId))
        .take(1000);
      const positionIds = new Set<Id<"positions">>();
      for (const chapter of chapters) {
        const moves = await ctx.db
          .query("moves")
          .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
          .take(1000);
        for (const move of moves) {
          positionIds.add(move.parentPositionId);
          positionIds.add(move.childPositionId);
        }
      }
      for (const positionId of positionIds) {
        const position = await ctx.db.get(positionId);
        if (position?.userId === ownerId) {
          await ctx.db.patch(positionId, { userId: target._id });
        }
      }
      await ctx.db.patch(courseId, { userId: target._id, updatedAt: Date.now() });
    } else if (args.resourceType === "repertoire") {
      await ctx.db.patch(args.resourceId as Id<"repertoires">, { userId: target._id, updatedAt: Date.now() });
    } else {
      await ctx.db.patch(args.resourceId as Id<"analyzedGames">, { userId: target._id });
    }

    const shares = await ctx.db
      .query("shareInvitations")
      .withIndex("by_resource_type_and_resource_id", (q) =>
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId),
      )
      .take(100);
    for (const share of shares) await ctx.db.delete(share._id);

    const links = await ctx.db
      .query("shareLinks")
      .withIndex("by_resource_type_and_resource_id", (q) =>
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId),
      )
      .take(100);
    for (const link of links) {
      await ctx.db.patch(link._id, { ownerId: target._id, updatedAt: Date.now() });
    }

    return { ownerEmail: target.email ?? email };
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
          if (
            invitation.resourceType === link.resourceType &&
            invitation.resourceId === link.resourceId &&
            sameScope(invitation, link.scopeType, link.scopeId)
          ) {
            effectiveAccess = strongest(effectiveAccess, invitation.access);
          }
        }
      }
    }

    return {
      resourceType: link.resourceType,
      resourceId: link.resourceId,
      scopeType: link.scopeType ?? "resource",
      scopeId: link.scopeId,
      scopeLabel: link.scopeLabel,
      access: effectiveAccess,
    };
  },
});
