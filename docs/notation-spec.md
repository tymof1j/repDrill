# Chess Move Notation Specification

This document defines two supported ways to record chess moves.

---

## 1. Standard Algebraic Notation (SAN)

This is the conventional chess notation used in books, databases, and tournament records.

### Examples

- `Rxb7+`
- `gxf7+`
- `Qh5#`
- `Nf3`

### Features

- `x` indicates a capture.
- `+` indicates check.
- `#` indicates checkmate.
- The full destination square is always included.
- Standard SAN disambiguation rules apply when two or more identical pieces can move to the same square.

### Disambiguation Examples

- `Nbd2` — the knight from the b-file moves to d2.
- `R1e1` — the rook from rank 1 moves to e1.
- `Qh4e1` — if full disambiguation is required.

---

## 2. Short Notation

This is a compact notation designed to reduce the number of characters.

### Rules

- `x` is omitted.
- `+` and `#` are omitted.
- For pawn captures, only the origin and destination files are written.
- For all other moves, use the piece letter followed by the destination square.
- SAN disambiguation rules are preserved exactly as in Standard Algebraic Notation.

### Examples

| Standard SAN | Short Notation |
|-------------|----------------|
| `Rxb7+`     | `Rb7`          |
| `Rxb7#`     | `Rb7`          |
| `gxf7+`     | `gf`           |
| `gxh8=Q#`   | `gh=Q`         |
| `Nf3`       | `Nf3`          |
| `Nbd2`      | `Nbd2`         |
| `R1e1+`     | `R1e1`         |

---

## Conversion Rule

Each move must be written in exactly one of two formats:

1. **Standard Algebraic Notation (SAN)** — includes all notation symbols.
2. **Short Notation** — omits all optional symbols (`x`, `+`, `#`) simultaneously.

Partial omission is **not allowed**.

---

## Invalid Mixed Forms

- `Rxb7` (omits `+` but keeps `x`)
- `Rb7+` (omits `x` but keeps `+`)
- `gxf7` (omits `+` but keeps `x`)
- `gf7+` (mixed notation)

---

## Valid Forms

- `Rxb7+` (SAN)
- `Rb7` (Short)
- `gxf7+` (SAN)
- `gf` (Short)

---

## Important Note on Disambiguation

This specification does **not override** standard SAN disambiguation rules.

If two or more identical pieces can legally move to the same square, the move must include the required file, rank, or both, according to standard SAN rules.

This requirement applies in **both** Standard Algebraic Notation and Short Notation.

### Examples

| Situation | Standard SAN | Short Notation |
|---------|---------|---------|
| Two knights can move to d2 | `Nbd2` | `Nbd2` |
| Two rooks can move to e1 | `R1e1+` | `R1e1` |
| Two rooks can capture b7 | `Rab7+` | `Rab7` |

---

## Summary

Two notation variants are supported:

- **Standard Algebraic Notation (SAN)** — full conventional notation.
- **Short Notation** — all optional symbols (`x`, `+`, `#`) are omitted together.

No hybrid forms are permitted.

All standard SAN disambiguation rules remain fully in effect.

---

## English piece letters only

Piece letters must be the English standard: `K` king, `Q` queen, `R` rook, `B` bishop, `N` knight. Localized letters (e.g. German `S`/`L`, Russian `Кр`/`Ф`) are **not** accepted by the input.
