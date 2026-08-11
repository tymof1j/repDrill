import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const LEGACY_SOURCE_MARKER = "legacy:woodpecker-easy-attempts:v1";
const LOCAL_STORAGE_SOURCE_MARKER = "repdrill:local-storage:v1";
const NATIVE_SOURCE_MARKER = "repdrill:native:v1";
const MAX_CYCLE = 10;
const MAX_PUZZLE = 5_000;
const MAX_PUZZLES_PER_SET = 5_000;
const MAX_ATTEMPTS_PER_IMPORT = 5_000;
const MAX_DURATION_MS = 24 * 60 * 60 * 1_000;

const bookKeyValidator = v.union(
  v.literal("woodpecker-method"),
  v.literal("woodpecker-method-2"),
);

const progressInputValidator = v.object({
  cycle: v.number(),
  position: v.number(),
  setSize: v.number(),
  solved: v.array(v.number()),
  missed: v.array(v.number()),
  startedAt: v.optional(v.number()),
});

type BookKey = "woodpecker-method" | "woodpecker-method-2";
type ProgressInput = {
  cycle: number;
  position: number;
  setSize: number;
  solved: number[];
  missed: number[];
  startedAt?: number;
};

function assertInteger(name: string, value: number, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
}

function assertFiniteNumber(name: string, value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a finite number from ${minimum} to ${maximum}`);
  }
}

function validateIdempotencyKey(value: string, requireSha256 = false) {
  if (requireSha256) {
    if (!/^sha256:[a-f0-9]{64}$/.test(value)) {
      throw new Error("idempotencyKey must be the lowercase SHA-256 digest prefixed with sha256:");
    }
    return;
  }
  if (value.length < 8 || value.length > 200 || !/^[A-Za-z0-9:._-]+$/.test(value)) {
    throw new Error("idempotencyKey must be 8-200 URL-safe characters");
  }
}

function validatedProgress(input: ProgressInput, missedCount = input.missed.length) {
  assertInteger("progress.cycle", input.cycle, 1, MAX_CYCLE);
  assertInteger("progress.setSize", input.setSize, 1, MAX_PUZZLE);
  assertInteger("progress.position", input.position, 1, input.setSize + 1);
  if (input.startedAt !== undefined) {
    assertFiniteNumber("progress.startedAt", input.startedAt, 0, Number.MAX_SAFE_INTEGER);
  }
  assertInteger("progress.missedCount", missedCount, 0, input.setSize);

  const solved = new Set<number>();
  for (const puzzle of input.solved) {
    assertInteger("progress.solved puzzle", puzzle, 1, input.setSize);
    if (solved.has(puzzle)) throw new Error(`progress.solved contains duplicate puzzle ${puzzle}`);
    solved.add(puzzle);
  }

  const missed = new Set<number>();
  for (const puzzle of input.missed) {
    assertInteger("progress.missed puzzle", puzzle, 1, input.setSize);
    if (missed.has(puzzle)) throw new Error(`progress.missed contains duplicate puzzle ${puzzle}`);
    if (solved.has(puzzle)) throw new Error(`Puzzle ${puzzle} cannot be both solved and missed`);
    missed.add(puzzle);
  }
  if (missedCount < missed.size) {
    throw new Error("progress.missedCount cannot be smaller than the known missed puzzle list");
  }

  return {
    ...input,
    solved: [...solved].sort((a, b) => a - b),
    missed: [...missed].sort((a, b) => a - b),
    missedCount,
    unresolvedMissedCount: missedCount - missed.size,
  };
}

async function findSummary(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  bookKey: BookKey,
) {
  return await ctx.db
    .query("bookProgress")
    .withIndex("by_user_id_and_book_key", (q) => q.eq("userId", userId).eq("bookKey", bookKey))
    .unique();
}

async function readSnapshot(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  bookKey: BookKey,
) {
  const summary = await findSummary(ctx, userId, bookKey);
  if (!summary) return null;

  const puzzleRows = await ctx.db
    .query("bookPuzzleProgress")
    .withIndex("by_user_id_and_book_key_and_cycle_and_puzzle", (q) =>
      q.eq("userId", userId).eq("bookKey", bookKey).eq("cycle", summary.cycle),
    )
    .take(MAX_PUZZLES_PER_SET);

  const solved = puzzleRows
    .filter((row) => row.solved)
    .map((row) => row.puzzle)
    .sort((a, b) => a - b);
  const missed = puzzleRows
    .filter((row) => row.missed && !row.solved)
    .map((row) => row.puzzle)
    .sort((a, b) => a - b);

  // Older summaries were created before the cycle clock was added. Recover
  // their start time from the append-only attempt history so existing cycles
  // also show the elapsed-day counter.
  const attemptRows = await ctx.db
    .query("bookPuzzleAttempts")
    .withIndex("by_user_id_and_book_key_and_cycle_and_puzzle_and_attempt", (q) =>
      q.eq("userId", userId).eq("bookKey", bookKey).eq("cycle", summary.cycle),
    )
    .take(MAX_ATTEMPTS_PER_IMPORT);
  const firstAttemptAt = attemptRows.reduce<number | undefined>(
    (earliest, row) => earliest === undefined ? row.recordedAt : Math.min(earliest, row.recordedAt),
    undefined,
  );

  return {
    bookKey,
    cycle: summary.cycle,
    position: summary.position,
    setSize: summary.setSize,
    solved,
    missed,
    solvedCount: summary.solvedCount,
    missedCount: summary.missedCount,
    unresolvedMissedCount: summary.unresolvedMissedCount,
    attemptCount: summary.attemptCount,
    startedAt: firstAttemptAt ?? summary.startedAt ?? null,
    updatedAt: summary.updatedAt,
    sourceMarker: summary.sourceMarker ?? null,
  };
}

export const getBookProgress = query({
  args: { bookKey: bookKeyValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await readSnapshot(ctx, userId, args.bookKey);
  },
});

export const recordAttempt = mutation({
  args: {
    bookKey: bookKeyValidator,
    puzzle: v.number(),
    success: v.boolean(),
    durationMs: v.optional(v.number()),
    attemptId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    assertInteger("puzzle", args.puzzle, 1, MAX_PUZZLE);
    if (args.durationMs !== undefined) {
      assertFiniteNumber("durationMs", args.durationMs, 0, MAX_DURATION_MS);
    }
    if (args.attemptId !== undefined) validateIdempotencyKey(args.attemptId);

    const now = Date.now();
    let summary = await findSummary(ctx, userId, args.bookKey);
    if (!summary) {
      const setSize = args.bookKey === "woodpecker-method" ? 1_128 : 1_000;
      const summaryId = await ctx.db.insert("bookProgress", {
        userId,
        bookKey: args.bookKey,
        cycle: 1,
        position: 1,
        setSize,
        solvedCount: 0,
        missedCount: 0,
        unresolvedMissedCount: 0,
        attemptCount: 0,
        sourceMarker: NATIVE_SOURCE_MARKER,
        createdAt: now,
        updatedAt: now,
      });
      summary = await ctx.db.get(summaryId);
      if (!summary) throw new Error("Could not initialize book progress");
    }
    if (args.puzzle > summary.setSize) {
      throw new Error(`Puzzle ${args.puzzle} is outside the current ${summary.setSize}-position set`);
    }

    const sourceAttemptKey = `${NATIVE_SOURCE_MARKER}:${args.attemptId ?? crypto.randomUUID()}`;
    if (args.attemptId) {
      const duplicate = await ctx.db
        .query("bookPuzzleAttempts")
        .withIndex("by_user_id_and_book_key_and_source_attempt_key", (q) =>
          q
            .eq("userId", userId)
            .eq("bookKey", args.bookKey)
            .eq("sourceAttemptKey", sourceAttemptKey),
        )
        .unique();
      if (duplicate) return await readSnapshot(ctx, userId, args.bookKey);
    }

    const puzzleState = await ctx.db
      .query("bookPuzzleProgress")
      .withIndex("by_user_id_and_book_key_and_cycle_and_puzzle", (q) =>
        q
          .eq("userId", userId)
          .eq("bookKey", args.bookKey)
          .eq("cycle", summary.cycle)
          .eq("puzzle", args.puzzle),
      )
      .unique();

    const attempt = (puzzleState?.attemptCount ?? 0) + 1;
    const durationMs = args.durationMs === undefined ? undefined : Math.round(args.durationMs);
    await ctx.db.insert("bookPuzzleAttempts", {
      userId,
      bookKey: args.bookKey,
      cycle: summary.cycle,
      puzzle: args.puzzle,
      attempt,
      success: args.success,
      durationMs,
      recordedAt: now,
      source: "native",
      sourceMarker: NATIVE_SOURCE_MARKER,
      sourceAttemptKey,
    });

    const wasSolved = puzzleState?.solved ?? false;
    const wasMissed = puzzleState?.missed ?? false;
    const resolvesUnidentifiedMiss =
      !puzzleState &&
      args.puzzle === summary.position &&
      summary.unresolvedMissedCount > 0;
    const solved = wasSolved || args.success;
    const missed = solved ? false : wasMissed || !args.success;
    const successfulTime = args.success ? durationMs : undefined;
    const bestSuccessTimeMs = successfulTime === undefined
      ? puzzleState?.bestSuccessTimeMs
      : puzzleState?.bestSuccessTimeMs === undefined
        ? successfulTime
        : Math.min(puzzleState.bestSuccessTimeMs, successfulTime);

    if (puzzleState) {
      await ctx.db.patch(puzzleState._id, {
        solved,
        missed,
        attemptCount: attempt,
        bestSuccessTimeMs,
        lastTimeMs: durationMs,
        lastSuccess: args.success,
        lastAttemptAt: now,
        sourceMarker: NATIVE_SOURCE_MARKER,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("bookPuzzleProgress", {
        userId,
        bookKey: args.bookKey,
        cycle: summary.cycle,
        puzzle: args.puzzle,
        solved,
        missed,
        attemptCount: attempt,
        bestSuccessTimeMs,
        lastTimeMs: durationMs,
        lastSuccess: args.success,
        lastAttemptAt: now,
        sourceMarker: NATIVE_SOURCE_MARKER,
        createdAt: now,
        updatedAt: now,
      });
    }

    let solvedCount = summary.solvedCount;
    let missedCount = summary.missedCount;
    let unresolvedMissedCount = summary.unresolvedMissedCount;
    if (!wasSolved && solved) solvedCount += 1;
    if (resolvesUnidentifiedMiss) {
      unresolvedMissedCount -= 1;
      if (args.success) missedCount = Math.max(0, missedCount - 1);
    } else if (!wasMissed && missed) {
      missedCount += 1;
    } else if (wasMissed && !missed) {
      missedCount = Math.max(0, missedCount - 1);
    }

    const position = args.success
      ? Math.max(summary.position, Math.min(summary.setSize + 1, args.puzzle + 1))
      : Math.max(summary.position, args.puzzle);
    await ctx.db.patch(summary._id, {
      position,
      solvedCount,
      missedCount,
      unresolvedMissedCount,
      attemptCount: summary.attemptCount + 1,
      // Start the cycle clock with the first recorded solution/attempt, not
      // when the user merely opens or advances to the cycle.
      startedAt: summary.startedAt ?? now,
      updatedAt: now,
    });

    return await readSnapshot(ctx, userId, args.bookKey);
  },
});

export const advanceCycle = mutation({
  args: {
    bookKey: bookKeyValidator,
    expectedCycle: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const summary = await findSummary(ctx, userId, args.bookKey);
    if (!summary) throw new Error("Book progress has not been started");
    if (args.expectedCycle !== undefined) {
      assertInteger("expectedCycle", args.expectedCycle, 1, MAX_CYCLE);
      if (args.expectedCycle !== summary.cycle) {
        return await readSnapshot(ctx, userId, args.bookKey);
      }
    }

    const now = Date.now();
    await ctx.db.patch(summary._id, {
      cycle: Math.min(MAX_CYCLE, summary.cycle + 1),
      position: 1,
      solvedCount: 0,
      missedCount: 0,
      unresolvedMissedCount: 0,
      // The cycle clock starts when the first position in the new cycle is
      // actually attempted. `recordAttempt` sets the timestamp.
      startedAt: undefined,
      updatedAt: now,
    });
    return await readSnapshot(ctx, userId, args.bookKey);
  },
});

export const migrateLocalProgress = mutation({
  args: {
    bookKey: bookKeyValidator,
    idempotencyKey: v.string(),
    progress: progressInputValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    validateIdempotencyKey(args.idempotencyKey);
    const progress = validatedProgress(args.progress);

    const priorImport = await ctx.db
      .query("bookProgressImports")
      .withIndex("by_user_id_and_book_key_and_source_marker", (q) =>
        q
          .eq("userId", userId)
          .eq("bookKey", args.bookKey)
          .eq("sourceMarker", LOCAL_STORAGE_SOURCE_MARKER),
      )
      .unique();
    if (priorImport) {
      if (priorImport.idempotencyKey !== args.idempotencyKey) {
        throw new Error("Local progress was already migrated with a different idempotency key");
      }
      return {
        status: "already_imported" as const,
        importId: priorImport._id,
        snapshot: await readSnapshot(ctx, userId, args.bookKey),
      };
    }

    if (await findSummary(ctx, userId, args.bookKey)) {
      return {
        status: "server_state_preserved" as const,
        importId: null,
        snapshot: await readSnapshot(ctx, userId, args.bookKey),
      };
    }

    const now = Date.now();
    await ctx.db.insert("bookProgress", {
      userId,
      bookKey: args.bookKey,
      cycle: progress.cycle,
      position: progress.position,
      setSize: progress.setSize,
      solvedCount: progress.solved.length,
      missedCount: progress.missedCount,
      unresolvedMissedCount: progress.unresolvedMissedCount,
      attemptCount: 0,
      startedAt: progress.startedAt,
      sourceMarker: LOCAL_STORAGE_SOURCE_MARKER,
      lastImportedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    for (const puzzle of progress.solved) {
      await ctx.db.insert("bookPuzzleProgress", {
        userId,
        bookKey: args.bookKey,
        cycle: progress.cycle,
        puzzle,
        solved: true,
        missed: false,
        attemptCount: 0,
        lastSuccess: true,
        lastAttemptAt: now,
        sourceMarker: LOCAL_STORAGE_SOURCE_MARKER,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const puzzle of progress.missed) {
      await ctx.db.insert("bookPuzzleProgress", {
        userId,
        bookKey: args.bookKey,
        cycle: progress.cycle,
        puzzle,
        solved: false,
        missed: true,
        attemptCount: 0,
        lastSuccess: false,
        lastAttemptAt: now,
        sourceMarker: LOCAL_STORAGE_SOURCE_MARKER,
        createdAt: now,
        updatedAt: now,
      });
    }
    const importId = await ctx.db.insert("bookProgressImports", {
      userId,
      bookKey: args.bookKey,
      kind: "local_storage",
      sourceMarker: LOCAL_STORAGE_SOURCE_MARKER,
      idempotencyKey: args.idempotencyKey,
      sourceRecordCount: progress.solved.length + progress.missed.length,
      importedAttemptCount: 0,
      cycle: progress.cycle,
      position: progress.position,
      setSize: progress.setSize,
      solvedCount: progress.solved.length,
      missedCount: progress.missedCount,
      createdAt: now,
      completedAt: now,
    });

    return {
      status: "imported" as const,
      importId,
      snapshot: await readSnapshot(ctx, userId, args.bookKey),
    };
  },
});

const legacyAttemptValidator = v.object({
  sourceRowKey: v.string(),
  track: v.literal("easy"),
  cycle: v.number(),
  puzzle: v.number(),
  attempt: v.number(),
  durationSeconds: v.number(),
  success: v.boolean(),
});

type LegacyAttempt = {
  sourceRowKey: string;
  track: "easy";
  cycle: number;
  puzzle: number;
  attempt: number;
  durationSeconds: number;
  success: boolean;
};

type AggregateAttempt = {
  cycle: number;
  puzzle: number;
  attempts: LegacyAttempt[];
};

export const importLegacyWoodpecker = mutation({
  args: {
    bookKey: v.literal("woodpecker-method"),
    sourceMarker: v.literal(LEGACY_SOURCE_MARKER),
    idempotencyKey: v.string(),
    attempts: v.array(legacyAttemptValidator),
    progress: v.object({
      cycle: v.number(),
      position: v.number(),
      setSize: v.number(),
      solved: v.array(v.number()),
      missed: v.array(v.number()),
      missedCount: v.number(),
      startedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    validateIdempotencyKey(args.idempotencyKey, true);
    if (args.attempts.length === 0 || args.attempts.length > MAX_ATTEMPTS_PER_IMPORT) {
      throw new Error(`attempts must contain 1-${MAX_ATTEMPTS_PER_IMPORT} normalized rows`);
    }
    const progress = validatedProgress(args.progress, args.progress.missedCount);

    const priorImport = await ctx.db
      .query("bookProgressImports")
      .withIndex("by_user_id_and_book_key_and_source_marker", (q) =>
        q
          .eq("userId", userId)
          .eq("bookKey", args.bookKey)
          .eq("sourceMarker", args.sourceMarker),
      )
      .unique();
    if (priorImport) {
      if (priorImport.idempotencyKey !== args.idempotencyKey) {
        throw new Error("This legacy source was already imported with a different payload digest");
      }
      return {
        status: "already_imported" as const,
        importId: priorImport._id,
        insertedAttempts: 0,
        insertedPuzzleProgress: 0,
        snapshot: await readSnapshot(ctx, userId, args.bookKey),
      };
    }
    const existingSummary = await findSummary(ctx, userId, args.bookKey);
    if (existingSummary) {
      // The client opportunistically seeds an empty backend from RepDrill's
      // old localStorage keys.  A verified legacy database export is richer
      // and may safely supersede that seed, but never overwrite native server
      // attempts made after the migration feature was enabled.
      if (
        existingSummary.sourceMarker !== LOCAL_STORAGE_SOURCE_MARKER ||
        existingSummary.attemptCount > 0
      ) {
        throw new Error("Book progress already contains server attempts and cannot be overwritten");
      }
      const localRows = await ctx.db
        .query("bookPuzzleProgress")
        .withIndex("by_user_id_and_book_key_and_cycle_and_puzzle", (q) =>
          q
            .eq("userId", userId)
            .eq("bookKey", args.bookKey)
            .eq("cycle", existingSummary.cycle),
        )
        .take(MAX_PUZZLES_PER_SET);
      if (localRows.some((row) => row.sourceMarker !== LOCAL_STORAGE_SOURCE_MARKER)) {
        throw new Error("Book progress contains non-local puzzle state and cannot be overwritten");
      }
      for (const row of localRows) await ctx.db.delete(row._id);
      await ctx.db.delete(existingSummary._id);
    }

    const seenSourceRows = new Set<string>();
    const aggregates = new Map<string, AggregateAttempt>();
    for (const row of args.attempts) {
      assertInteger("attempt.cycle", row.cycle, 1, MAX_CYCLE);
      assertInteger("attempt.puzzle", row.puzzle, 1, progress.setSize);
      assertInteger("attempt.attempt", row.attempt, 1, 10);
      assertFiniteNumber("attempt.durationSeconds", row.durationSeconds, 0, MAX_DURATION_MS / 1_000);
      const expectedSourceRowKey = `${row.track}:${row.cycle}:${row.puzzle}:${row.attempt}`;
      if (row.sourceRowKey !== expectedSourceRowKey) {
        throw new Error(`Invalid sourceRowKey ${row.sourceRowKey}; expected ${expectedSourceRowKey}`);
      }
      if (seenSourceRows.has(row.sourceRowKey)) {
        throw new Error(`Duplicate sourceRowKey ${row.sourceRowKey}`);
      }
      seenSourceRows.add(row.sourceRowKey);
      const aggregateKey = `${row.cycle}:${row.puzzle}`;
      const aggregate = aggregates.get(aggregateKey) ?? {
        cycle: row.cycle,
        puzzle: row.puzzle,
        attempts: [],
      };
      aggregate.attempts.push(row);
      aggregates.set(aggregateKey, aggregate);
    }

    const expectedSolved = new Set(progress.solved);
    const expectedMissed = new Set(progress.missed);
    const derivedSolved = new Set<number>();
    const derivedMissed = new Set<number>();
    for (const aggregate of aggregates.values()) {
      aggregate.attempts.sort((a, b) => a.attempt - b.attempt);
      for (let index = 1; index < aggregate.attempts.length; index += 1) {
        if (aggregate.attempts[index - 1].attempt === aggregate.attempts[index].attempt) {
          throw new Error(`Duplicate attempt number for cycle ${aggregate.cycle}, puzzle ${aggregate.puzzle}`);
        }
      }
      if (aggregate.cycle !== progress.cycle) continue;
      const last = aggregate.attempts.at(-1)!;
      if (last.success) derivedSolved.add(aggregate.puzzle);
      else derivedMissed.add(aggregate.puzzle);
    }
    if (
      derivedSolved.size !== expectedSolved.size ||
      [...derivedSolved].some((puzzle) => !expectedSolved.has(puzzle))
    ) {
      throw new Error("progress.solved does not match the final outcomes in the current cycle");
    }
    if ([...derivedMissed].some((puzzle) => !expectedMissed.has(puzzle))) {
      throw new Error("progress.missed is missing a known failed current-cycle puzzle");
    }

    const now = Date.now();
    const importId = await ctx.db.insert("bookProgressImports", {
      userId,
      bookKey: args.bookKey,
      kind: "legacy_csv",
      sourceMarker: args.sourceMarker,
      idempotencyKey: args.idempotencyKey,
      sourceRecordCount: aggregates.size,
      importedAttemptCount: args.attempts.length,
      cycle: progress.cycle,
      position: progress.position,
      setSize: progress.setSize,
      solvedCount: progress.solved.length,
      missedCount: progress.missedCount,
      createdAt: now,
      completedAt: now,
    });

    for (const row of args.attempts) {
      await ctx.db.insert("bookPuzzleAttempts", {
        userId,
        bookKey: args.bookKey,
        cycle: row.cycle,
        puzzle: row.puzzle,
        attempt: row.attempt,
        success: row.success,
        durationMs: Math.round(row.durationSeconds * 1_000),
        recordedAt: now,
        source: "legacy_import",
        sourceMarker: args.sourceMarker,
        sourceAttemptKey: `${args.sourceMarker}:${row.sourceRowKey}`,
        importId,
      });
    }

    for (const aggregate of aggregates.values()) {
      const last = aggregate.attempts.at(-1)!;
      const successfulTimes = aggregate.attempts
        .filter((row) => row.success)
        .map((row) => Math.round(row.durationSeconds * 1_000));
      const explicitSolved = aggregate.cycle === progress.cycle && expectedSolved.has(aggregate.puzzle);
      const explicitMissed = aggregate.cycle === progress.cycle && expectedMissed.has(aggregate.puzzle);
      const solved = explicitSolved || (aggregate.cycle !== progress.cycle && last.success);
      const missed = explicitMissed || (aggregate.cycle !== progress.cycle && !last.success);
      await ctx.db.insert("bookPuzzleProgress", {
        userId,
        bookKey: args.bookKey,
        cycle: aggregate.cycle,
        puzzle: aggregate.puzzle,
        solved,
        missed: solved ? false : missed,
        attemptCount: aggregate.attempts.length,
        bestSuccessTimeMs: successfulTimes.length > 0 ? Math.min(...successfulTimes) : undefined,
        lastTimeMs: Math.round(last.durationSeconds * 1_000),
        lastSuccess: last.success,
        lastAttemptAt: now,
        sourceMarker: args.sourceMarker,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const puzzle of [...progress.solved, ...progress.missed]) {
      if (aggregates.has(`${progress.cycle}:${puzzle}`)) continue;
      const solved = expectedSolved.has(puzzle);
      await ctx.db.insert("bookPuzzleProgress", {
        userId,
        bookKey: args.bookKey,
        cycle: progress.cycle,
        puzzle,
        solved,
        missed: !solved,
        attemptCount: 0,
        lastSuccess: solved,
        lastAttemptAt: now,
        sourceMarker: args.sourceMarker,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("bookProgress", {
      userId,
      bookKey: args.bookKey,
      cycle: progress.cycle,
      position: progress.position,
      setSize: progress.setSize,
      solvedCount: progress.solved.length,
      missedCount: progress.missedCount,
      unresolvedMissedCount: progress.unresolvedMissedCount,
      attemptCount: args.attempts.length,
      startedAt: progress.startedAt,
      sourceMarker: args.sourceMarker,
      lastImportedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      status: "imported" as const,
      importId,
      insertedAttempts: args.attempts.length,
      insertedPuzzleProgress: aggregates.size,
      snapshot: await readSnapshot(ctx, userId, args.bookKey),
    };
  },
});
