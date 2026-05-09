/** Minimal PGN parser. Handles:
 *  - Headers in [Tag "value"]
 *  - Move tokens in SAN
 *  - Variations in (...)
 *  - Comments in {...}
 *  - NAG ($1, $2, ...) — stripped
 *  - Multiple games separated by [Event ...] headers
 *
 *  Output is a tree of move tokens; resolving SAN → FEN happens later via chess.js. */

export type PgnMoveNode = {
  san: string;
  comment?: string;
  variations: PgnMoveNode[][];
};

export type PgnGame = {
  headers: Record<string, string>;
  moves: PgnMoveNode[];
};

export function parsePgn(pgn: string): PgnGame[] {
  const games: PgnGame[] = [];
  const text = pgn.replace(/\r\n/g, '\n').trim();
  if (!text) return games;

  let i = 0;

  while (i < text.length) {
    // Skip whitespace between games
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i >= text.length) break;

    const headers: Record<string, string> = {};

    // Read headers
    while (i < text.length && text[i] === '[') {
      const end = text.indexOf(']', i);
      if (end === -1) break;
      const line = text.slice(i + 1, end);
      const match = line.match(/^(\w+)\s+"(.*)"\s*$/);
      if (match) headers[match[1]] = match[2];
      i = end + 1;
      while (i < text.length && /\s/.test(text[i])) i++;
    }

    // Read movetext until next game or end
    const moveTextStart = i;
    while (i < text.length) {
      if (text[i] === '[' && i + 1 < text.length && /[A-Z]/.test(text[i + 1])) {
        // Heuristic: a new header tag starts a new game
        // But only if preceded by whitespace/newline (to avoid mid-move false positive — unlikely in valid PGN)
        break;
      }
      i++;
    }
    const moveText = text.slice(moveTextStart, i);

    const moves = parseMoveText(moveText);
    if (Object.keys(headers).length > 0 || moves.length > 0) {
      games.push({ headers, moves });
    }
  }

  return games;
}

function parseMoveText(text: string): PgnMoveNode[] {
  const tokens = tokenize(text);
  const { nodes } = readSequence(tokens, 0);
  return nodes;
}

type Token =
  | { type: 'move'; san: string }
  | { type: 'comment'; value: string }
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

    // Comment {...}
    if (c === '{') {
      const end = text.indexOf('}', i);
      if (end === -1) break;
      const raw = text.slice(i + 1, end);
      // Strip Lichess clock annotations [%clk ...] and similar
      const clean = raw.replace(/\[%[^\]]*\]/g, '').trim();
      if (clean) tokens.push({ type: 'comment', value: clean });
      i = end + 1;
      continue;
    }

    // Variation
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

    // Line comment ; ...
    if (c === ';') {
      const end = text.indexOf('\n', i);
      i = end === -1 ? text.length : end + 1;
      continue;
    }

    // NAG $N — strip
    if (c === '$') {
      i++;
      while (i < text.length && /\d/.test(text[i])) i++;
      continue;
    }

    // Move number "12." or "12..."
    if (/\d/.test(c)) {
      const start = i;
      while (i < text.length && /\d/.test(text[i])) i++;
      // Result tokens
      const numStr = text.slice(start, i);
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
      // Move number — eat trailing dots
      while (i < text.length && text[i] === '.') i++;
      // If next is a digit-only token like "1-0", we already handled. Otherwise this is a move number, skip.
      void numStr;
      continue;
    }

    // Result "*"
    if (c === '*') {
      tokens.push({ type: 'result', value: '*' });
      i++;
      continue;
    }

    // SAN move token
    if (/[a-zA-Z]/.test(c)) {
      const start = i;
      while (i < text.length && /[a-zA-Z0-9+#=!?\-/]/.test(text[i])) i++;
      const san = text.slice(start, i);
      if (san) tokens.push({ type: 'move', san });
      continue;
    }

    // Unknown char — skip
    i++;
  }

  return tokens;
}

function readSequence(tokens: Token[], start: number): { nodes: PgnMoveNode[]; next: number } {
  const nodes: PgnMoveNode[] = [];
  let i = start;

  while (i < tokens.length) {
    const t = tokens[i];

    if (t.type === 'close' || t.type === 'result') {
      return { nodes, next: i };
    }

    if (t.type === 'comment') {
      // Comment before any move — attach to previous node, or skip if no prior
      if (nodes.length > 0) {
        const last = nodes[nodes.length - 1];
        last.comment = last.comment ? `${last.comment} ${t.value}` : t.value;
      }
      i++;
      continue;
    }

    if (t.type === 'open') {
      // Variation applies to the most-recently-played move's parent — i.e., it's an alternative
      // to the LAST move in `nodes`. So pop the last move and attach variation as alt to its parent.
      // Simpler model: variation is an alternative continuation from BEFORE the last move.
      // We store it on the last move's `variations` so the renderer/import can branch.
      i++;
      const { nodes: varNodes, next } = readSequence(tokens, i);
      i = next;
      if (i < tokens.length && tokens[i].type === 'close') i++;
      if (nodes.length > 0) {
        nodes[nodes.length - 1].variations.push(varNodes);
      }
      continue;
    }

    if (t.type === 'move') {
      nodes.push({ san: t.san, variations: [] });
      i++;
      continue;
    }

    i++;
  }

  return { nodes, next: i };
}
