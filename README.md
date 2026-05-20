# RepDrill

A Convex-backed chess opening repertoire trainer — annotated lines, FSRS-based recall, and game review against your prep.

Built with Next.js 16, Convex, Convex Auth, and FSRS. You can export single courses as PGN or your full library as JSON, so your prep stays portable.

## Getting started

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server **must** run on port 3000 — if the port is busy, free it rather than falling back (see [AGENTS.md](AGENTS.md)).

For hosted data, point the app at a Convex deployment with `NEXT_PUBLIC_CONVEX_URL`,
`NEXT_PUBLIC_CONVEX_SITE_URL`, and matching Convex Auth provider environment variables.

## What's inside

- **Courses** — annotated theory, organized in chapters of lines.
- **Repertoires** — merged-view prep that pulls from one or more courses.
- **Train** — FSRS-driven spaced-recall sessions on due lines.
- **Analyze** — review your recent games against your prep and flag departures.
- **FAQ** — `/documentation` (shortcuts, notation spec, why FSRS, why spaced repetition).

## PGN import behavior

- If a PGN game has a meaningful `ChapterName` or `Event`, RepDrill uses it as the chapter name.
- If headers are missing/placeholder (for example `?`), and you imported a single file, RepDrill falls back to the uploaded filename (without `.pgn`).
- RepDrill auto-detects informational content and marks chapters as `info-only` when it finds `idea/ideas/game/games` in:
  - the filename,
  - PGN headers,
  - or PGN comments.
- `Info-only` chapters/lines are viewable everywhere (course viewer, repertoire viewer, and Learn), but they are not scheduled for memorization via FSRS.
- In Learn, an `info-only` line is shown once and then marked as viewed.
- You can manually switch both chapter type and individual line type between `training` and `info-only` in the course detail UI.

## Chess-board-recognition (planned)

Main product wish: import tactics directly from chess books (PDF page ranges), with screenshot import as a stepping stone while the PDF pipeline matures.

`FEN` (Forsyth-Edwards Notation) is a compact text string that fully describes a chess position (piece placement, side to move, castling rights, en-passant target, and move counters). In this feature, FEN is the canonical format used to convert recognized boards into trainable positions.

Planned workflow:
1. User uploads a PDF (target flow) or screenshot (early bridge flow).
2. System extracts board candidates from selected pages/images and converts each into a proposed FEN.
3. System determines side to move from explicit cues near the diagram: either text like `White to move` / `Black to move`, or a nearby square/triangle marker where marker color indicates the side to move.
4. If puzzle answers exist, they are captured and attached to each tactic either by reading notation printed near the board, or by copy-pasting the answer block (often from the end of the book) that maps puzzle number -> solution moves (+ comments when present).
5. Validation checks legality and move parsing.
6. Output is a structured scan result (positions + side-to-move + mapped solutions) ready for later import into the web platform.

Note: interactive candidate review/editing in the web UI is a separate downstream feature for the platform import flow, not part of the current scan pipeline scope.

(connected files: [docs/tactics-import-plan.md](docs/tactics-import-plan.md), [docs/tactics-import-plan-claude.md](docs/tactics-import-plan-claude.md), [docs/backlog.md](docs/backlog.md), [docs/plan.md](docs/plan.md))

## Keyboard-first flow

RepDrill is built to be usable without reaching for the mouse. Pretty nice, honestly.

- `C`, `R`, `T`, `A` jump between Courses, Repertoires, Train, and Analyze.
- In repertoire trees, use arrow keys to move through lines, `1`-`9` for branches, `Home`/`End` for root/deepest move, `V` for arrows, and `/` for annotation search.
- In training, `Tab` switches between board input and notation input, and `Enter` submits notation.

## Roadmap & backlog

- [docs/backlog.md](docs/backlog.md) — the running list of fixes and feature work (mirrored from the project-level backlog kept outside the repo).
- [docs/plan.md](docs/plan.md) — sequencing for the backlog: what to build next, and why in that order.

## Notation reference

The keyboard-input notation rules (SAN + Short notation) are documented in [docs/notation-spec.md](docs/notation-spec.md) and rendered in-app at `/documentation/notation`.

## License

AGPL-3.0.
