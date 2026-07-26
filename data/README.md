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
