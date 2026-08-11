/**
 * Small, forgiving PGN parser used by the course importer.
 *
 * SAN is intentionally validated later by chess.js.  Here we preserve the
 * parts of a study PGN that are easy to lose while tokenising: comments, NAGs
 * and bracket directives.  Chessable exports use `%repdrill-arrow`/
 * `%repdrill-circle`; Lichess exports use `%clk`, `%cal` and `%csl`.  Unknown
 * directives are retained in `directives` so importing and exporting a course
 * remains forward compatible.
 */

export type PgnDirective = {
  /** Directive name without the leading `%` (for example `clk`). */
  name: string;
  /** Key/value arguments, when the directive uses `key=value` syntax. */
  args: Record<string, string>;
  /** Positional payload for directives such as `%cal` and `%csl`. */
  value?: string;
  /** Original bracket token, retained for lossless export. */
  raw: string;
};

export type PgnArrow = {
  start: string;
  end: string;
  color?: string;
  raw?: string;
};

export type PgnCircle = {
  square: string;
  color?: string;
  raw?: string;
};

export type PgnMoveAnnotations = {
  nags: number[];
  directives: PgnDirective[];
  arrows: PgnArrow[];
  circles: PgnCircle[];
  /** Convenience projection of `%clk`/`%emt` directives. */
  clocks: string[];
};

export type PgnMoveNode = {
  san: string;
  comment?: string;
  annotations?: PgnMoveAnnotations;
  variations: PgnMoveNode[][];
};

export type PgnGame = {
  headers: Record<string, string>;
  moves: PgnMoveNode[];
  /** A PGN FEN header, when the game starts from a non-standard position. */
  startFen?: string;
};

/**
 * Legacy SQLite course rows only have one free-text annotation column.  Keep a
 * deterministic textual representation there when importing through that
 * compatibility path; Convex imports store the same data in structured move
 * fields.  Raw directives are intentionally retained so a later export can
 * reconstruct arrows, circles and clocks exactly.
 */
export function serializeMoveAnnotations(annotations?: PgnMoveAnnotations) {
  if (!annotations) return '';
  const nags = annotations.nags.map((nag) => `$${nag}`);
  const directives = annotations.directives.map((directive) => directive.raw);
  return [...nags, ...directives].join(' ');
}

export function parsePgn(pgn: string): PgnGame[] {
  const games: PgnGame[] = [];
  const text = pgn.replace(/\r\n/g, '\n').trim();
  if (!text) return games;

  let i = 0;

  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i >= text.length) break;

    const headers: Record<string, string> = {};

    // Read headers.  PGN values may contain escaped quotes/backslashes; scan
    // the complete line rather than stopping at the first `]` in a value.
    while (i < text.length && text[i] === '[') {
      const end = findHeaderEnd(text, i);
      if (end === -1) break;
      const line = text.slice(i + 1, end);
      const match = line.match(/^(\w+)\s+"((?:\\.|[^"])*)"\s*$/);
      if (match) headers[match[1]] = unescapeHeaderValue(match[2]);
      i = end + 1;
      while (i < text.length && /\s/.test(text[i])) i++;
    }

    // Read movetext until the next game's Event/header block.
    const moveTextStart = i;
    while (i < text.length) {
      if (text[i] === '[' && i + 1 < text.length && /[A-Z]/.test(text[i + 1])) break;
      i++;
    }
    const moves = parseMoveText(text.slice(moveTextStart, i));
    const startFen = headers.FEN || undefined;
    if (Object.keys(headers).length > 0 || moves.length > 0) {
      games.push({ headers, moves, startFen });
    }
  }

  return games;
}

function findHeaderEnd(text: string, start: number) {
  let escaped = false;
  let inQuote = false;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === '\\') {
      escaped = true;
      continue;
    }
    if (c === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (c === ']' && !inQuote) return i;
    if (c === '\n' && !inQuote) return -1;
  }
  return -1;
}

function unescapeHeaderValue(value: string) {
  return value.replace(/\\([\\"])/g, '$1');
}

function parseMoveText(text: string): PgnMoveNode[] {
  const tokens = tokenize(text);
  const { nodes } = readSequence(tokens, 0);
  return nodes;
}

type Token =
  | { type: 'move'; san: string }
  | { type: 'comment'; value: string; annotations?: PgnMoveAnnotations }
  | { type: 'nag'; value: number }
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'result'; value: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < text.length) {
    const c = text[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // Comment {...}.  Keep prose readable for the existing annotation UI and
    // retain every directive in structured metadata.
    if (c === '{') {
      const end = findCommentEnd(text, i);
      if (end === -1) break;
      const raw = text.slice(i + 1, end);
      const annotations = parseMoveAnnotations(raw);
      const clean = raw.replace(/\[%[^\]]*\]/g, '').trim();
      if (clean || annotations) {
        tokens.push({ type: 'comment', value: clean, annotations });
      }
      i = end + 1;
      continue;
    }

    if (c === '(') {
      tokens.push({ type: 'open' });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'close' });
      i++;
      continue;
    }

    // Line comment ; ... (directives are not legal outside {...}).
    if (c === ';') {
      const end = text.indexOf('\n', i);
      i = end === -1 ? text.length : end + 1;
      continue;
    }

    // Preserve NAG $N instead of silently dropping it.
    if (c === '$') {
      const start = i + 1;
      i++;
      while (i < text.length && /\d/.test(text[i])) i++;
      const value = Number(text.slice(start, i));
      if (Number.isFinite(value)) tokens.push({ type: 'nag', value });
      continue;
    }

    // Move number "12." or "12..." and result tokens beginning with a digit.
    if (/\d/.test(c)) {
      const start = i;
      while (i < text.length && /\d/.test(text[i])) i++;
      if (text.slice(start).startsWith('1-0')) {
        tokens.push({ type: 'result', value: '1-0' });
        i = start + 3;
        continue;
      }
      if (text.slice(start).startsWith('0-1')) {
        tokens.push({ type: 'result', value: '0-1' });
        i = start + 3;
        continue;
      }
      if (text.slice(start).startsWith('1/2-1/2')) {
        tokens.push({ type: 'result', value: '1/2-1/2' });
        i = start + 7;
        continue;
      }
      while (i < text.length && text[i] === '.') i++;
      continue;
    }

    if (c === '*') {
      tokens.push({ type: 'result', value: '*' });
      i++;
      continue;
    }

    // SAN token.  Chess.js performs the legality check later.
    if (/[a-zA-Z]/.test(c)) {
      const start = i;
      while (i < text.length && /[a-zA-Z0-9+#=!?.\-/]/.test(text[i])) i++;
      const san = text.slice(start, i);
      if (san) tokens.push({ type: 'move', san });
      continue;
    }

    i++;
  }

  return tokens;
}

function findCommentEnd(text: string, start: number) {
  let escaped = false;
  for (let i = start + 1; i < text.length; i++) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (text[i] === '\\') {
      escaped = true;
      continue;
    }
    if (text[i] === '}') return i;
  }
  return -1;
}

function emptyMoveAnnotations(): PgnMoveAnnotations {
  return { nags: [], directives: [], arrows: [], circles: [], clocks: [] };
}

function hasMoveAnnotations(value: PgnMoveAnnotations) {
  return value.nags.length > 0 || value.directives.length > 0 || value.arrows.length > 0 ||
    value.circles.length > 0 || value.clocks.length > 0;
}

/** Parse all bracket directives in a comment, including unknown directives. */
function parseMoveAnnotations(comment: string): PgnMoveAnnotations | undefined {
  const matches = [...comment.matchAll(/\[%([^\]]+)\]/g)];
  if (matches.length === 0) return undefined;

  const annotations = emptyMoveAnnotations();
  for (const match of matches) {
    const raw = match[0];
    const body = match[1].trim();
    if (!body) continue;
    const nameMatch = body.match(/^([^\s]+)(?:\s+([\s\S]*))?$/);
    const name = nameMatch?.[1] ?? body;
    const payload = nameMatch?.[2]?.trim() ?? '';
    const args: Record<string, string> = {};
    const keyValuePattern = /([A-Za-z][A-Za-z0-9_-]*)=("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s]+)/g;
    let keyValueMatch: RegExpExecArray | null;
    while ((keyValueMatch = keyValuePattern.exec(payload))) {
      let value = keyValueMatch[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      args[keyValueMatch[1]] = value;
    }
    const positional = payload.replace(keyValuePattern, '').trim();
    const directive: PgnDirective = {
      name,
      args,
      ...(positional ? { value: positional } : {}),
      raw,
    };
    annotations.directives.push(directive);

    if (name === 'clk' || name === 'emt') {
      const clock = args.value ?? args.time ?? directive.value ?? payload;
      if (clock) annotations.clocks.push(clock);
    }

    if (name === 'repdrill-arrow') {
      const start = args.start ?? args.from;
      const end = args.end ?? args.to;
      if (start && end) annotations.arrows.push({ start, end, ...(args.color ? { color: args.color } : {}), raw });
    } else if (name === 'repdrill-circle') {
      const square = args.start ?? args.square ?? args.at;
      if (square) annotations.circles.push({ square, ...(args.color ? { color: args.color } : {}), raw });
    } else if (name === 'cal') {
      annotations.arrows.push(...parseLichessArrows(directive));
    } else if (name === 'csl') {
      annotations.circles.push(...parseLichessCircles(directive));
    }
  }

  return hasMoveAnnotations(annotations) ? annotations : undefined;
}

function lichessColor(code: string) {
  const colors: Record<string, string> = { G: 'green', R: 'red', Y: 'yellow', B: 'blue' };
  return colors[code.toUpperCase()] ?? code;
}

function parseLichessArrows(directive: PgnDirective): PgnArrow[] {
  const value = directive.value ?? '';
  return value.split(',').flatMap((item) => {
    const token = item.trim();
    if (!token) return [];
    const match = token.match(/^([GRYB]?)([a-h][1-8])[-:]([a-h][1-8])$/i);
    if (!match) return [];
    return [{ start: match[2], end: match[3], color: lichessColor(match[1] || 'G'), raw: directive.raw }];
  });
}

function parseLichessCircles(directive: PgnDirective): PgnCircle[] {
  const value = directive.value ?? '';
  return value.split(',').flatMap((item) => {
    const token = item.trim();
    if (!token) return [];
    const match = token.match(/^([GRYB]?)([a-h][1-8])$/i);
    if (!match) return [];
    return [{ square: match[2], color: lichessColor(match[1] || 'G'), raw: directive.raw }];
  });
}

function mergeAnnotations(left: PgnMoveAnnotations | undefined, right: PgnMoveAnnotations | undefined) {
  if (!left) return right;
  if (!right) return left;
  return {
    nags: [...left.nags, ...right.nags],
    directives: [...left.directives, ...right.directives],
    arrows: [...left.arrows, ...right.arrows],
    circles: [...left.circles, ...right.circles],
    clocks: [...left.clocks, ...right.clocks],
  } satisfies PgnMoveAnnotations;
}

function readSequence(tokens: Token[], start: number): { nodes: PgnMoveNode[]; next: number } {
  const nodes: PgnMoveNode[] = [];
  let i = start;
  let pendingComment = '';
  let pendingAnnotations: PgnMoveAnnotations | undefined;
  let pendingNags: number[] = [];

  while (i < tokens.length) {
    const t = tokens[i];

    if (t.type === 'close' || t.type === 'result') return { nodes, next: i };

    if (t.type === 'comment') {
      // A comment after a move belongs to that move.  A leading comment in a
      // variation belongs to its first move instead of being discarded.
      if (nodes.length > 0) {
        const last = nodes[nodes.length - 1];
        if (t.value) last.comment = last.comment ? `${last.comment} ${t.value}` : t.value;
        last.annotations = mergeAnnotations(last.annotations, t.annotations);
      } else {
        if (t.value) pendingComment = pendingComment ? `${pendingComment} ${t.value}` : t.value;
        pendingAnnotations = mergeAnnotations(pendingAnnotations, t.annotations);
      }
      i++;
      continue;
    }

    if (t.type === 'nag') {
      if (nodes.length > 0) {
        const last = nodes[nodes.length - 1];
        last.annotations = mergeAnnotations(last.annotations, {
          nags: [t.value], directives: [], arrows: [], circles: [], clocks: [],
        });
      } else {
        pendingNags.push(t.value);
      }
      i++;
      continue;
    }

    if (t.type === 'open') {
      i++;
      const { nodes: varNodes, next } = readSequence(tokens, i);
      i = next;
      if (i < tokens.length && tokens[i].type === 'close') i++;
      if (nodes.length > 0) nodes[nodes.length - 1].variations.push(varNodes);
      continue;
    }

    if (t.type === 'move') {
      const annotations = mergeAnnotations(pendingAnnotations, pendingNags.length > 0 ? {
        nags: pendingNags, directives: [], arrows: [], circles: [], clocks: [],
      } : undefined);
      nodes.push({
        san: t.san,
        ...(pendingComment ? { comment: pendingComment } : {}),
        ...(annotations ? { annotations } : {}),
        variations: [],
      });
      pendingComment = '';
      pendingAnnotations = undefined;
      pendingNags = [];
      i++;
      continue;
    }

    i++;
  }

  return { nodes, next: i };
}
