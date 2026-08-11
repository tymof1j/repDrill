# Built-in course data

`woodpecker-method.tsv` is a local, auditable extraction of the user-supplied
copy of *The Woodpecker Method* by Axel Smith and Hans Tikkanen.

Each exercise keeps:

- the recognized FEN and side to move;
- legal SAN and UCI solution moves;
- the full answer text;
- White, Black, event/location, and year;
- the printed book page and PDF page.

The corresponding runtime artifact is
`src/data/woodpecker-method.json`. Regenerate both from the source PDF with
`../position-scan-mvp/export_woodpecker.py`.

## Private course captures and learner state

Raw course material, source-page captures, PGNs, `*.status.json`, and learner
progress exports are private operational data. They are intentionally ignored
by Git under `data/import/` and must be imported into the configured Convex
deployment rather than committed to this repository.

Local export/finalizer scripts may be retained next to those archives, but they
and their input/output stay out of the repository. Woodpecker’s live cycle,
solved, and missed-queue state is learner data: preserve it in Convex (and a
local recovery export), never in a repository commit.

The Woodpecker correction viewer never reads a PDF from `public/`. To enable
it, set the server-only `WOODPECKER_SOURCE_PDF_URL` to a private host or Convex
Storage URL. If that host needs bearer authentication, also set
`WOODPECKER_SOURCE_PDF_BEARER_TOKEN`. The authenticated
`/api/source-documents/woodpecker` endpoint proxies the file without exposing
the upstream URL or token. When no URL is configured, the UI clearly disables
the preview while keeping local correction entry available.
