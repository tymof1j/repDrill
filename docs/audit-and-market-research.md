# RepDrill: Codebase Audit, Performance Review & Market Research

> Generated 2026-05-15

---

## Table of Contents
1. [Codebase Overview](#1-codebase-overview)
2. [What's Done Well (Excellence)](#2-excellence)
3. [Errors & Bugs](#3-errors--bugs)
4. [Areas to Improve](#4-areas-to-improve)
5. [Performance & Speed Optimization](#5-performance--speed-optimization)
6. [Backlog Status](#6-backlog-status)
7. [Competitor Comparison](#7-competitor-comparison)
8. [Feature Roadmap Recommendations](#8-feature-roadmap-recommendations)

---

## 1. Codebase Overview

**Stack**: Next.js 16 + Convex + TypeScript 5 + Tailwind CSS 4 + chessground + ts-fsrs

**Structure**:
- `src/app/` — pages: train, analyze, courses, share, settings
- `src/components/` — shared UI (board, layout, nav)
- `src/lib/` — chess logic, SRS, PGN parser, course import
- `convex/` — 13 backend functions (mutations, queries, auth)

**Data model** (Convex):
- `users`, `courses`, `chapters`, `moves`, `positions` — repertoire tree
- `repertoires`, `repertoireCourses`, `repertoireChoices` — merged views
- `reviewCards`, `reviewLogs` — FSRS spaced repetition
- `analyzedGames` — game import + deviation tracking

---

## 2. Excellence

### Architecture Wins

| Pattern | Why It's Good |
|---------|---------------|
| **Position-first tree model** | Moves reference child positions by FEN. Multiple parents → same FEN = automatic transposition handling. Notes/review merge across transpositions. Solves major UX problem competitors don't. |
| **FSRS via ts-fsrs** | Most advanced open-source SRS algorithm. 20-30% fewer reviews than SM-2 for same retention. Eliminates "ease hell". Ahead of all open-source competitors. |
| **Server actions + Convex mutations** | Atomic ops, no race conditions, auto-revalidation via Next.js cache. Zero fetch calls on client. |
| **Dynamic board import (SSR-safe)** | chessground loaded with `ssr: false` + skeleton. No hydration mismatches. |
| **Keyboard-first UX** | Tab toggles mouse/notation input. Global shortcuts (C, R, T, A, /). Usable one-handed — chess players love this. |
| **Homegrown PGN parser** | No network call, offline-capable, full control over interpretation. |
| **Convex auth + middleware** | Route protection at middleware level. Tokens auto-refreshed. Can't skip via client routing. |
| **Type-safe Convex schema** | Zod-like validators. TypeScript enforces argument types. Refactoring a schema field = compile-time errors. |
| **Convex real-time subscriptions** | `useQuery` auto-syncs. Neither ChessDriller (Prisma) nor Listudy (Phoenix) match this reactivity. |
| **Review log with responseTimeMs** | Enables future analytics no competitor has. Response time can adjust difficulty. |

---

## 3. Errors & Bugs

### Critical (broken features)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | **Game analysis returns empty book** — `loadUserBookFromConvex()` stubbed, returns empty Map. All games show "no repertoire for color". | `src/app/analyze/actions.ts:140` | Analysis feature non-functional |
| 2 | **Shared course viewing not implemented** — returns "temporarily unavailable" placeholder | `src/app/share/[token]/page.tsx:13` | Share tokens generated but unusable |
| 3 | **Shared course copying throws** — "not yet implemented for Convex" | `src/app/courses/actions.ts:134` | Can't import shared courses |
| 4 | **"In book" misfire** — game starting `1. f4` labeled "in book" when no f4 course exists | Backlog item | Usability bug in analyze |

### Major (performance / correctness risks)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 5 | **Unbounded `.collect()` everywhere** — 8+ calls without limits violate Convex guidelines (32k doc limit) | `convex/training.ts:35-176` | Will break at scale (1000+ positions) |
| 6 | **O(n) position lookups** — loop fetches positions one-by-one | `convex/courses.ts:125-129` | 1000+ individual reads for large courses |
| 7 | **FSRS logic duplicated** — Convex inlines scheduling to avoid src/ imports | `convex/training.ts:6-26` vs `src/lib/srs/fsrs.ts` | Drift risk between two copies |
| 8 | **Empty `.catch()` blocks** — swallows network/permission/bug errors identically | `src/app/analyze/actions.ts:234-276` | Can't distinguish "not ready" from "network down" |

---

## 4. Areas to Improve

### Code Quality

| Issue | Where | Fix |
|-------|-------|-----|
| **Large undecomposed components** (929 LOC AnalyzePanel, 733 LOC TrainingSession) | `src/app/analyze/`, `src/app/train/` | Extract hooks: `useAnalysisState`, `useTrainingPhase`. Split sub-components with memo. |
| **Blanket ESLint disable** | `src/app/train/TrainingSession.tsx:1` | Replace with targeted disables + comments |
| **Untyped FormData casts** | `actions.ts` files | Add Zod validation on FormData before casting |
| **Magic numbers** | SYNC_COOLDOWN, time thresholds, newLineLimit | Extract to constants file |
| **Missing type exports** | `LinePhase`, `SessionPhase` internal to .tsx | Export for testing/composition |
| **Unused variable** | `lineDueCount` in `convex/training.ts:182` | Remove or wire up |

### Architecture

| Issue | Fix |
|-------|-----|
| No global error boundary | Add error boundaries per route segment |
| No custom hooks for complex state | Extract `useTrainingSession`, `useAnalysisPanel` |
| localStorage sync sets 4 states separately | Parse once, batch update |
| No pagination on course tree view | Add limits, lazy-load chapters |

---

## 5. Performance & Speed Optimization

### For Fast Page Loads / Low Latency

| Optimization | Priority | Detail |
|-------------|----------|--------|
| **Cap `.collect()` queries** | P0 | Use `.take(limit)` + pagination. Prevents 32k doc limit crashes and reduces query time. |
| **Batch position fetches** | P0 | Replace O(n) `ctx.db.get(posId)` loop with indexed batch query. |
| **Extract timer from AnalyzePanel** | P1 | 1-second re-render of 929-LOC component. Move cooldown timer to own hook/component. |
| **Memoize sub-components** | P1 | GameList, BoardView, MoveInput — wrap in `React.memo()`. |
| **Lazy-load chapters** | P1 | Don't fetch all chapter trees on course detail page. Load on expand. |
| **Batch state updates** | P2 | localStorage parse → 4 separate `setState` calls. Consolidate. |
| **Preload chessground** | P2 | `<link rel="modulepreload">` for board JS. Reduces visible skeleton time. |
| **Service worker for offline** | P3 | Cache board assets, PGN parser, recent course data. Enables offline training. |

### For Fast Network (Ping/RTT)

| Optimization | Priority | Detail |
|-------------|----------|--------|
| **Reduce Convex round-trips** | P0 | `getTrainingLines()` does N+1 queries (courses → chapters → moves → positions → cards). Restructure to fewer, bigger queries. |
| **Optimistic mutations** | P1 | Submit review rating optimistically. Don't wait for Convex round-trip before showing next card. |
| **Edge caching** | P2 | Static assets via CDN. Next.js ISR for public pages (landing, shared courses). |
| **Prefetch next training card** | P2 | While user answers current card, prefetch next card's position/moves. Eliminates perceived latency between cards. |

---

## 6. Backlog Status

**19 total items. 1 done, 4 partial, 14 not started.**

### Sprint 0 — Strategy (do first)
| Item | Status | Notes |
|------|--------|-------|
| Competitive scan + SWOT | **NOW DONE** (this document) | |
| Scope "wrong teaching method" | NOT STARTED | Needs concrete problem description |

### Sprint 1 — Bugfixes + Foundations (1-2 weeks)
| Item | Status | Complexity |
|------|--------|-----------|
| Fix "in book" misfire | NOT STARTED | Low |
| Verify ElasticSearch or remove | NOT STARTED | Low |
| Parse `{bracket}` annotations into UI | NOT STARTED | Medium |
| Train: all lines vs. specific repertoire dropdown | NOT STARTED | Low |
| Chapter line viewer UX | NOT STARTED | Medium |
| Short-form notation input | **DONE** ✓ | — |

### Sprint 2 — Differentiation (pick ≤3)
| Item | Status | Complexity |
|------|--------|-----------|
| Tactics mode (theory vs tactics courses) | NOT STARTED | High |
| Improve sharing (viewing + copying) | PARTIAL (schema ready) | Medium-High |
| Export interop (ChessBase, Chessable, Lichess) | NOT STARTED | Medium |
| Stats dashboard split | NOT STARTED | Medium |
| Puzzles + puzzle sets | NOT STARTED | Very High |

### Deferred
| Item | Status |
|------|--------|
| Landing page redesign | NOT STARTED |
| Faster opponent moves + speed setting | NOT STARTED |
| Audit Ukrainian translations | NOT STARTED |
| Cache last 10 fetched games | NOT STARTED |

### TODOs in Code
| Location | What |
|----------|------|
| `src/app/share/[token]/page.tsx:13` | Shared course viewing |
| `src/app/analyze/actions.ts:140` | User book building for deviation detection |
| `src/app/analyze/actions.ts:294` | Load user book from Convex |
| `src/app/courses/actions.ts:134` | Shared course copying |

---

## 7. Competitor Comparison

### Head-to-Head Matrix

| Feature | **RepDrill** | **ChessDriller** | **Listudy** | **Chessable** |
|---------|-------------|-----------------|------------|--------------|
| **Stack** | Next.js 16 + Convex | Svelte + Node + Prisma | Elixir/Phoenix + PostgreSQL | Proprietary (React) |
| **SRS Algorithm** | FSRS (best) | SM-2 variant | Leitner (simplest) | Proprietary (SM-2-like) |
| **Real-time sync** | Yes (Convex) | No | No | Partial |
| **Board library** | chessground | chessground | Custom | Custom |
| **Transposition handling** | Yes (position-first) | No | No | Limited |
| **Game analysis** | Partial (stubbed) | No | No | Yes |
| **Deviation detection** | Schema ready, not wired | TODO (wanted) | No | Yes |
| **Sharing** | Schema ready, not wired | No | Yes (public/unlisted) | Yes (marketplace) |
| **Offline** | No | No | No | Yes (mobile) |
| **i18n** | Partial (UK planned) | No | Yes (gettext) | Yes |
| **Tactics/puzzles** | Planned | No | Yes | Yes |
| **Video content** | No | No | No | Yes |
| **Marketplace/content** | No | No | Community | Yes (paid courses) |
| **Mobile** | Responsive | Unknown | Broken (#183) | Native app |
| **Self-hostable** | No | Yes (Docker) | Yes | No |
| **Auth** | Convex auth | Lichess OAuth only | Standard | Email + OAuth |
| **Keyboard-first** | Yes | No | No | No |

### Architecture Comparison

| Aspect | RepDrill | ChessDriller | Listudy |
|--------|---------|--------------|---------|
| **Data layer** | Convex (cloud, real-time) | Prisma + SQL (self-hosted) | Ecto + PostgreSQL |
| **Rendering** | RSC + client components | Svelte SPA | Server-rendered HTML |
| **Reactivity** | Subscriptions (automatic) | Manual refresh | Page reload |
| **Scalability** | Cloud-managed | Limited by host | Limited by host |
| **DX** | Type-safe end-to-end | Good (Svelte + TS) | Mixed (Elixir + JS) |

### Key Competitor Weaknesses

**ChessDriller**:
- Prisma optimization issues (noted in their code)
- No real-time sync
- Lichess-only auth (no Chess.com users)
- No game analysis
- Small feature set

**Listudy**:
- 61 open issues, many basic bugs (board not rendering, mobile broken)
- Server-rendered = limited interactivity
- Leitner system is inferior to FSRS
- Separate Python process for image generation
- Maintenance appears stalled

**Chessable**:
- #1 complaint: **review queue overwhelm** causes burnout
- Gamification creates anxiety, not learning
- Pricing: free→PRO migration frustrated users
- Too memorization-focused, doesn't teach principles
- Platform stability issues lock users from paid content
- Default SRS settings don't fit many learners

### What ChessDriller Wants But Doesn't Have (steal list)

From their TODO.md:
1. ~~Track games + notify on out-of-repertoire moves~~ → RepDrill has schema for this
2. Repertoire tree with color-coded maturity heatmap
3. Leech detection via lapse tracking
4. "Variations due" display (not just move count)
5. Visual feedback for wrong moves (shake, red flash)
6. Reward stamps for mastered moves
7. "Skip to first due move" during practice
8. PGN comments during study
9. Practice any chapter regardless of due status
10. Slower interval growth for 30+ day intervals

---

## 8. Feature Roadmap Recommendations

### RepDrill's Competitive Moat

Three things no open-source competitor has:
1. **FSRS** — best SRS algorithm available
2. **Position-first transposition model** — automatic note/review sharing across transpositions
3. **Convex real-time** — reactive UI without manual refresh

### What to Build (Priority Order)

#### Tier 1 — Fix What's Broken (Week 1)
These are already built but not working:

| Feature | Effort | Why |
|---------|--------|-----|
| Wire up `loadUserBookFromConvex()` | 2-3 days | Analysis feature is core differentiator. Schema + UI ready, just needs data loading. |
| Fix "in book" misfire | 1 day | Usability bug erodes trust in analysis. |
| Cap `.collect()` + batch position fetches | 1-2 days | Prevents breakage at scale. |

#### Tier 2 — Differentiation Features (Weeks 2-4)
Features competitors want but don't have:

| Feature | Effort | Why |
|---------|--------|-----|
| **Leech detection dashboard** | 3 days | Flag moves with high `lapses` in `reviewCards`. Show "problem moves" list. Neither ChessDriller nor Chessable surfaces this well. |
| **Repertoire tree with maturity heatmap** | 1 week | Color-code each move by SRS state (new/learning/review/mastered). ChessDriller's most-wanted feature. |
| **Practice specific chapter on-demand** | 2 days | Drill any chapter regardless of SRS schedule. ChessDriller's top TODO. Chessable has it. |
| **Out-of-repertoire game feed** | 3 days | Surface deviation analysis as "Games to Review" with one-click "add line to repertoire". Data exists, UI needed. |
| **Anti-overwhelm: daily review caps** | 1 day | Chessable's #1 complaint is review burnout. Set smart session limits. FSRS makes this easy. |

#### Tier 3 — Polish (Weeks 4-6)
UX quality that retains users:

| Feature | Effort | Why |
|---------|--------|-----|
| Visual feedback on wrong moves (shake/flash) | 1 day | CSS animations, big UX impact |
| Variation-level progress ("3/12 variations mastered") | 2 days | Better progress signal than move count |
| Time-until-next-review when queue empty | 0.5 day | Reduces "nothing to do" anxiety |
| PGN comment display during training | 2 days | Requires `{bracket}` annotation parsing (Sprint 1 item) |
| Parse `{bracket}` annotations into UI | 2 days | Prerequisite for comments + tactics mode |
| Shared course viewing + copying | 3 days | Schema ready, needs public query + clone logic |

#### Tier 4 — Big Bets (Month 2+)
Only if differentiation analysis confirms:

| Feature | Effort | Why |
|---------|--------|-----|
| Tactics mode (theory vs tactics courses) | 2 weeks | Needs annotations + per-position timing. High effort but differentiator if users want it. |
| Export interop (ChessBase, Chessable, Lichess) | 1 week | Lock-in prevention = trust |
| Offline support via service worker | 1 week | Chessable's offline mode is praised |
| Stats dashboard | 1 week | Meaningful only with enough usage data |

### What NOT to Build

| Feature | Why Skip |
|---------|----------|
| Course marketplace | Content creation is a different business. Focus on tool, not content. |
| Video integration | High effort, low differentiation for a study tool. |
| Puzzles/puzzle sets | Very high effort. Lichess/Chess.com do this better. Focus on repertoire niche. |
| Self-hosting | Convex architecture makes this impractical. Cloud-first is fine. |

### Key Insight from User Research

> "Spaced repetition should not dominate chess study. Balance review with new material." — Nick Visel (switched from Chessable to Anki)

**Implication for RepDrill**: Don't copy Chessable's "zero reviews daily" pressure. Instead:
- Cap daily reviews at a reasonable number
- Suggest new lines to learn based on what opponents play (via game analysis)
- Show "repertoire coverage" vs "memorization completeness" — users want to know what they DON'T know yet, not just drill what they do

---

## Summary

**RepDrill is architecturally strong** — FSRS, position-first transpositions, Convex real-time, keyboard-first UX. These are genuine competitive advantages over ChessDriller, Listudy, and even aspects of Chessable.

**Main weakness**: Several core features are stubbed/broken (game analysis, sharing, unbounded queries). Fixing these unlocks the most value with least effort.

**Biggest opportunity**: Connect training to real games. No open-source competitor does this. RepDrill has the schema. Wire it up → strongest differentiation.

**Biggest risk**: Copying Chessable's review-pressure model. FSRS is better, but UX design matters more than algorithm quality. Build anti-overwhelm features from day one.
