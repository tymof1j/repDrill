# RepDrill

A self-hosted chess opening repertoire trainer — annotated lines, FSRS-based recall, and game review against your prep.

Built with Next.js 16, SQLite (via Drizzle ORM + `better-sqlite3`), and Auth.js.

## Getting started

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server **must** run on port 3000 — if the port is busy, free it rather than falling back (see [AGENTS.md](AGENTS.md)).

## What's inside

- **Courses** — annotated theory, organized in chapters of lines.
- **Repertoires** — merged-view prep that pulls from one or more courses.
- **Train** — FSRS-driven spaced-recall sessions on due lines.
- **Analyze** — review your recent games against your prep and flag departures.
- **FAQ** — `/documentation` (shortcuts, notation spec, why FSRS, why spaced repetition).

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
