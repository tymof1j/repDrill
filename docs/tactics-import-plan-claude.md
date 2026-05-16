# Tactics Import — Claude's Lean Plan

**Author:** Claude (Opus 4.7)
**Date:** 2026-05-16
**Status:** Counter-proposal to `tactics-import-plan.md`. Optimized for shipping value in 2 weeks instead of 2 quarters.

---

## Thesis

The Codex plan is correct in shape but wrong in sequencing. It builds a research pipeline (custom CV models, synthetic datasets, Vertex AI training) before proving anyone wants the feature. Ship the smallest thing that imports a real tactic from a real screenshot, validate demand, then earn the right to invest in ML.

Three principles:
1. **Screenshots before scans.** Screenshots are pixel-perfect, fixed orientation, known piece sets. Solvable without ML. Book scans are 80% of the complexity for 20% of the early demand.
2. **Template matching before training.** chess.com and lichess publish their piece sprites. Match against them. No model, no dataset, no GPU.
3. **User confirms before publish.** The recognition layer's job is to give the user a *good first guess*, not to be correct. Mandatory review UI carries the accuracy burden.

---

## Phase 0 — Spike (3 days)

Goal: prove a single chess.com screenshot → FEN works end-to-end in a throwaway script.

- Python script, no service yet.
- Input: PNG of a chess.com board.
- Output: FEN string.
- Steps:
  - Find board bbox: largest contour with ~1:1 aspect ratio, or detect via Hough lines on 8×8 grid edges.
  - Crop board, resize to 512×512, split into 64 64×64 squares.
  - Compare each square against a sprite library of `{empty light, empty dark, white pawn on light, white pawn on dark, ...}` using normalized cross-correlation or perceptual hash.
  - Emit FEN from per-square argmax.

Kill criterion: if accuracy on 10 hand-collected screenshots is <90% after 3 days, the screenshot path is harder than expected — escalate or pivot.

---

## Phase 1 — MVP-0 (Week 1-2)

### Recognition service

- FastAPI service, single endpoint `POST /recognize` accepting an image, returning `{ fen, orientation, confidence, squareConfidences[64] }`.
- Deployed to Modal.com or Fly.io. No GPU needed for template matching.
- No PDF, no OCR, no book scans, no real-board photos.
- Supported sources: chess.com screenshot, lichess screenshot, lichess puzzle URL (skip recognition — fetch FEN from lichess API directly).

### Convex schema delta — minimal

```ts
// convex/schema.ts
moves: defineTable({
  // existing fields...
  kind: v.optional(v.union(v.literal("theory"), v.literal("tactic"))),
  startFen: v.optional(v.string()),
  solutionUci: v.optional(v.array(v.string())),
})

tacticImportJobs: defineTable({
  userId: v.id("users"),
  courseId: v.id("courses"),
  storageId: v.id("_storage"),
  status: v.union(
    v.literal("pending"),
    v.literal("recognized"),
    v.literal("confirmed"),
    v.literal("failed"),
  ),
  fen: v.optional(v.string()),
  confidence: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_course_status", ["courseId", "status"]);
```

No `contentType` on courses. No `chapters.contentType`. Tactics live next to theory moves under the same chapter, distinguished by `kind`.

### Upload + recognize flow

1. Client uploads image to Convex `_storage` (signed upload URL — already built into Convex).
2. Client calls mutation `tacticImport.createJob({ courseId, storageId })`.
3. Convex action fetches image from storage, POSTs to recognition service, writes result to `tacticImportJobs`.
4. Client subscribes to job, shows review UI when `status === "recognized"`.

### Review UI

Single screen per candidate:
- Left: original screenshot.
- Right: rendered board from detected FEN (reuse existing board component).
- Editable FEN string (text input, validated with `chess.js`).
- Orientation flip button.
- Side-to-move toggle (w/b). Default to whichever side has more obvious threats — or just default to white and let user flip. Don't try to detect from pixels.
- Solution input: textarea, paste SAN like `Nxf7+ Kxf7 Qh5+`. Parse with `chess.js`, validate legality from FEN, store as UCI array.
- "Add to course" button → creates a `moves` row with `kind: "tactic"`, `startFen`, `solutionUci`.

If `chess.js` rejects FEN or solution, button is disabled with inline error. No silent failures.

### Training UI

- New route or branch in existing trainer: if `move.kind === "tactic"`, render `move.startFen` instead of walking from opening position.
- User plays first move. Compare against `solutionUci[0]`.
- Correct → if more moves remain, engine/script plays `solutionUci[1]` as opponent, user plays `solutionUci[2]`, etc.
- Wrong → show solution, log incorrect attempt.
- Log to existing `reviewLogs` table. Reuse `responseTimeMs`. No new logging table.

---

## Phase 2 — After 10 paying users actually use tactics (out of scope for this doc)

Only build if Phase 1 metrics justify it:
- PDF support: page-range picker + tesseract for solution OCR.
- Custom square classifier: only when template matching fails on real user uploads. Train on actual failures, not synthetic data.
- Stats dashboard split.
- Themes/tags per tactic (mate-in-2, fork, pin).

---

## Stack

| Concern | Pick | Why |
|---|---|---|
| Recognition service | Python + FastAPI + OpenCV | Standard, no ML deps needed |
| Hosting | Modal.com or Fly.io | Deploy in minutes, scales to zero, no Vertex AI sprawl |
| Storage | Convex `_storage` | Already wired, signed URLs built-in |
| Validation | `chess.js` (existing dep) | FEN + legality + SAN→UCI |
| Board render | Existing component | Already in repo |
| Async jobs | Convex actions + scheduler | Already supported |
| Training data | None yet | Template matching needs none |

Explicitly **not** in stack:
- ❌ Vertex AI / GCS / Cloud Run — premature
- ❌ PyTorch / YOLO — no model to train
- ❌ Stockfish — not needed for legality
- ❌ Synthetic dataset generator — no model consumes it
- ❌ OCR (tesseract) — solutions are pasted by user

---

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| chess.com/lichess piece sets vary by theme | Pre-render full sprite library for top 5 themes each. Fall back to "couldn't recognize, please edit FEN manually" rather than guessing wrong. |
| User uploads copyrighted book scans | MVP-0 accepts screenshots only. Reject PDFs in UI until legal clarity. |
| Recognition accuracy embarrasses on launch | Frame UI as "auto-fill, please review" not "auto-import." Confidence score visible. Review is mandatory. |
| Tactics pollute theory FSRS scheduling | `kind` field on `moves` lets training UI and stats branch. Existing FSRS row works for both since both are "card was due, user answered, rate it." |

---

## Test plan

- Unit: FEN parse, FEN→board roundtrip, SAN→UCI, legality check from detected FEN.
- Recognition integration: 20-image golden set checked into repo. CI runs recognition, asserts ≥18/20 match expected FEN.
- E2E: upload screenshot → review → publish → train → log entry created. One Playwright test covering the full happy path.
- Schema migration: existing `moves` rows continue working with `kind` undefined (treated as theory).

---

## Why this beats the Codex plan for *this* moment

| Codex plan | Claude plan |
|---|---|
| 6+ months, GPU training pipeline | 2 weeks, no training |
| Builds for book scans + screenshots + real boards | Builds for screenshots only |
| Custom OCR for solutions | User pastes solution |
| New tables for content type at course/chapter level | Single `kind` field on moves |
| Vertex AI / Cloud Run / GCS signed URLs | Modal/Fly + Convex `_storage` |
| Validates the recognition pipeline before the product | Validates the product before the pipeline |

Both end up at the same destination if demand is real. This path gets there with one quarter less burn and an exit ramp if users don't bite.

---

*— Claude (Opus 4.7)*
