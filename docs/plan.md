# What to build next — an actionable plan

A pass over the backlog with one question in front: **what's the next thing worth working on right now?** This isn't a wish-list ordering — it's an attempt to sequence the items so each one unblocks or de-risks the ones after it.

> Companion to [docs/backlog.md](./backlog.md). When items move from "todo" to "in progress" or "done," update both files.

---

## TL;DR — what to build next

**Do the strategy work first, not a feature.** The single highest-leverage item on the backlog is **the competitive scan + honest SWOT** against [Listudy](https://github.com/ArneVogel/listudy) and [Chessdriller](https://github.com/gtim/chessdriller). Reasoning:

- Whether to invest in **puzzles**, **trainer dashboards**, **sharing**, **export interop**, or **tactics mode** is downstream of one question: *what does RepDrill do better than the existing free, open-source competitors, and where is parity enough?*
- The two competitors named are mature, free, and self-hostable. Until we know what we're actually competing on, we risk building features that already exist somewhere else with a head start.
- This is ~1–2 evenings of work, not a sprint. Output is a 1-page differentiation note and a sharpened priority order for everything else in the backlog.

**Once that's done, the next concrete batch is bugfixes + foundations** (see Sprint 1 below), because they're cheap, high-trust, and unblock the more ambitious items.

---

## Sequencing — three sprints

Order matters more than scope here. Treat each "sprint" as a coherent batch you'd ship as one branch + PR.

### Sprint 0 — Strategy (this week)

Goal: stop deciding by gut, decide by comparison.

1. **Competitive scan + SWOT** ([backlog item](./backlog.md#short-term-high-priority-work-step-by-step))
   - Sit with Listudy and Chessdriller for 30 min each. Note: import paths, training flow, share/study model, export, multiplayer/trainer features, stats.
   - Skim [chessdriller's TODO.md](https://github.com/gtim/chessdriller/blob/main/TODO.md) and tag ideas worth lifting.
   - Output: a 1-page note — *what RepDrill does that others don't, what's at parity, what's behind, and the 2–3 differentiation bets to lean into.*
2. **Scope "wrong teaching method"** — write 3–5 sentences describing what specifically is wrong with the current training flow. Without this, the largest line item in the backlog can't be acted on.

Exit criteria: a differentiation note + a scoped description of the teaching-method problem. Do not start Sprint 1 before this.

### Sprint 1 — Bugfixes + small foundations (1–2 weeks)

Goal: tighten what already exists. These are small, isolated, and build user trust.

3. **"In book" misfire in Analyze** — actual bug. A game starting `1. f4` is labeled "in book" when there's no f4 course. Investigate the matching logic in `analyze` server actions. Fix + add a regression test if possible.
4. **Verify ElasticSearch actually works** — pure verification: pick three known queries, run them, confirm hits. If it doesn't work, decide between fixing it and ripping it out (Fuse.js is already a dep).
5. **Short-form move notation parsing** — currently the notation FAQ documents Short Notation but the parser still rejects it. Wrap `chess.move()` with a normalizer that expands `gf` → `gxf` and strips check/mate markers before strict validation. Source of truth: [docs/notation-spec.md](./notation-spec.md).
6. **Parse `{bracket}` annotations into course content** — the parser already sees PGN comments; surface them on the position card in Train and on the chapter line viewer. **This is a foundation, not a feature** — Tactics mode and the chapter line viewer both depend on it.
7. **Train: pick "all lines" vs. a specific repertoire** — a dropdown above the queue. Persist last choice in localStorage.
8. **Course chapter line viewer — define click behavior + visual pass** — currently underspecified. Decide on a single click action (proposal: opens a read-only analysis board with the line + annotations). Don't ship variants — pick one and ship it.

Exit criteria: trust bugs gone, parser accepts both notations, annotations visible in-app, Train respects scope. No new big features yet.

### Sprint 2 — Differentiation bets (after Sprint 0 conclusions)

Goal: build the 2–3 things Sprint 0 identified as RepDrill's edge. The list below is the candidate pool; **pick at most three** based on the SWOT output.

- **Tactics mode** (two course modes: theory vs. tactics) — depends on annotation parsing (Sprint 1, #6). Major UX project. Includes per-position timing, group/session mode, and a header with game context ("Carlsen–Nepomniachtchi, WCC 2021, Game 6").
- **Improve sharing** — explicit scope: link expiry, view-only vs. forkable, what's stripped. Without scope this stalls.
- **Export interop** — concrete targets first (Lichess study? ChessBase? plain PGN with annotations preserved?), then implement.
- **Stats dashboard split** — separate views for theory recall stats vs. tactics stats. Only worth building once tactics mode exists; otherwise it's a one-half-empty dashboard.
- **Puzzles + trainer dashboards** — high ambition; only do this if Sprint 0 concludes it's a real differentiator. Otherwise defer to "later."

### Later (keep on the backlog, don't pull forward)

- Landing page: show-don't-tell — important polish, but not a learning blocker.
- Faster opponent moves + speed setting — small UX win, do in any spare slot.
- Cache last 10 fetched games from API — only useful once usage justifies it.
- Highlights & arrows on the board — feature creep until users ask for it.

---

## Cross-cutting decisions to make once, not per item

| Decision | Owner | Why it matters |
|---|---|---|
| Canonical backlog location | Tima | This file and `files/fixes-backlog.md` will drift if both stay. Pick one and mirror with a script, or kill the external one. |
| i18n strategy | Tima | Language preference now persists, but no strings are translated yet. Decide: do we translate the whole UI, or only the user-facing surfaces? |
| Migration apply ritual | Tima | `pnpm drizzle-kit migrate` works locally; add a `db:migrate` script and document in README so it's not lost. |
| What "trainer dashboard" means | Tima | Mentioned in puzzle item — without a clear user (self-coached player? coach managing N students?), don't build. |

---

## How to use this plan

- **One sprint open at a time.** Don't pick from Sprint 2 while Sprint 1 has open items.
- **Items move as a unit.** When a backlog item lands, mark it `[x]` in both [docs/backlog.md](./backlog.md) and the relevant sprint above.
- **The plan is mutable.** Sprint 0's output may rewrite Sprint 2 entirely — that's the point.
