# Fixes Backlog

Running list of fixes / improvements. Each entry: short title, description, status.

## Status legend
- [ ] todo
- [~] in progress
- [x] done

---

## Later (not now)

- [ ] **Landing page: show, don't tell** — migrate landing copy from heavy text to a "show, not tell" presentation (less wording, more demonstration / visuals).
- [ ] **Faster opponent moves in training + speed setting** — increase the playback speed of opponent moves during training, and expose a user-facing setting on the site to control it.

---

## Short-term, high-priority (work step by step)

- [ ] **Valid move input — short form + notation hints**
  - Accept short-form move notation in the move input.
  - Show a note that the site only accepts notation in the X form (figurine/SAN — clarify with user) and in **English**.
- [ ] **Wrong teaching method** — current training/teaching method is wrong; revisit and fix (needs scoping).
- [ ] **Parse `{bracket}` annotations into course content** — annotations inside `{...}` in PGN/lines should be parsed and surfaced in the course.
- [ ] **Verify elastic search works** — confirm the elastic-search functionality is actually wired up and returning results.
- [ ] **Highlights & arrows on the board (?)** — decide what to do; potentially add the ability to draw highlights/arrows on the board.
- [ ] **Cache last 10 fetched games from API** — when games are pulled via API, cache the most recent 10 with timestamps ("last 10 games as of <time>") to avoid re-fetching.
- [ ] **Train: choose all lines vs. specific repertoire** — in the Train view, let the user pick whether to drill across all lines or only a specific repertoire.
- [ ] **Puzzles + puzzle sets/courses (?)** — feature idea: puzzles and the ability to build sets/courses of puzzles, potentially for trainers to assign to students (ties into a tracking dashboard).
- [ ] **Stats dashboard split in two** — split the statistics dashboard into two views; one of them being puzzle/theory learning stats (useful even for personal use, not just trainers).
- [ ] **"In book" misfire in Analyze** — Analyze section labels a game starting `1. f4` as "in book" even though no such line exists in courses; investigate matching logic.
- [ ] **Improve export format** — make the export easier to import into other chess tools (e.g. ChessBase, Chessable, Lichess study, plain PGN). Audit what's currently exported and add lossless interchange formats.
- [ ] **Two course modes: theory vs. tactics**
  - **Theory** (current behavior): drill-to-remember via spaced repetition.
  - **Tactics**: solve each position multiple times early on, but the main objective is solving it correctly once. Time each solve individually and in group/session mode.
  - Annotations should already be present on the position — any hints, history, or context (e.g. "Carlsen–Nepomniachtchi, World Championship 2021, Game 6") shown at the top of the position card.
  - Annotation parsing (the `{bracket}` item above) is a prerequisite for surfacing this context.
- [ ] **Tactics/theory: shared substrate** — placeholder for the cross-cutting work needed once both modes exist (course-creation UI, stats per mode, mixed sessions).
- [ ] **Improve sharing** — current sharing flow is unfinished; revisit (what gets shared, with whom, link expiry, view-only vs. forkable, etc.).
- [ ] **Competitive scan + honest SWOT**
  - Compare against [ArneVogel/listudy](https://github.com/ArneVogel/listudy) and [gtim/chessdriller](https://github.com/gtim/chessdriller) — feature parity audit, ergonomics, what they do better.
  - Write an honest SWOT for RepDrill vs. each, and answer: does RepDrill bring anything genuinely new? If yes, sharpen that angle. If not, decide whether to compete or specialize.
- [ ] **Steal ideas from chessdriller's TODO** — review [chessdriller/TODO.md](https://github.com/gtim/chessdriller/blob/main/TODO.md) and lift anything that fits RepDrill's direction.
- [ ] **Course chapter line viewer — UX + logic**
  - Improve the visual presentation of lines inside a course chapter.
  - Decide what should happen when a user clicks a line — preview? jump to drill? open in analysis board? Currently underspecified.

---

## Notes / open questions
- Confirm what "X form" means for move notation (figurine, SAN, long algebraic, ...).
- "Wrong teaching method" needs concrete description before implementation.
- Puzzle feature and dashboard-split are flagged with `?` — pending decision.
- Decide where the canonical backlog lives (this file vs. the in-repo mirror at `repdrill/docs/backlog.md`).
