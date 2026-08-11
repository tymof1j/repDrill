import type { BoardArrow, BoardSquareMark } from '@/components/board/ChessBoard';

/**
 * The Chessable archive stores board drawings in PGN comments using private
 * `%repdrill-*` directives.  Keep the parser deliberately small and forgiving
 * so old exports (which use `start`) and newer exports (which use `square`) are
 * both rendered.
 */
export type StudyMarkup = {
  text: string;
  arrows: BoardArrow[];
  squareMarks: BoardSquareMark[];
};

/** Shape metadata persisted on a move by the PGN/Convex importer. */
export type StoredMoveAnnotations = {
  arrows?: Array<{ start: string; end: string; color?: string }>;
  circles?: Array<{ square: string; color?: string }>;
  directives?: Array<{
    name: string;
    args: Record<string, string>;
    value?: string;
    raw: string;
  }>;
};

const SQUARE = /^[a-h][1-8]$/i;
const DIRECTIVE = /\[%repdrill-(arrow|circle)\s+([^\]]+)\]/gi;
const ATTRIBUTE = /([a-z]+)\s*=\s*([a-z0-9+#-]+)/gi;

function parseAttributes(source: string) {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE)) {
    attributes.set(match[1].toLowerCase(), match[2].toLowerCase());
  }
  return attributes;
}

function validSquare(value: string | undefined) {
  return value && SQUARE.test(value) ? value.toLowerCase() : undefined;
}

function normalizeBrush(value: string | undefined) {
  const brush = value?.trim().toLowerCase();
  return brush || undefined;
}

/** Parse a stored comment into visible prose plus Chessground shapes. */
export function parseStudyMarkup(
  annotation: string | null | undefined,
  stored?: StoredMoveAnnotations | null,
): StudyMarkup {
  if (!annotation && !stored) return { text: '', arrows: [], squareMarks: [] };

  const arrows: BoardArrow[] = [];
  const squareMarks: BoardSquareMark[] = [];
  const text = (annotation ?? '')
    .replace(DIRECTIVE, (_whole, kind: string, attributes: string) => {
      const values = parseAttributes(attributes);
      const orig = validSquare(values.get('start') ?? values.get('square'));
      if (!orig) return '';
      const brush = normalizeBrush(values.get('color'));
      if (kind.toLowerCase() === 'circle') {
        squareMarks.push({ orig, brush });
      } else {
        const dest = validSquare(values.get('end') ?? values.get('to'));
        if (dest) arrows.push({ orig, dest, brush });
      }
      return '';
    })
    // Directive-only comments often leave an extra pair of spaces/newlines.
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  // New imports persist drawings as structured metadata on the move.  Keep
  // accepting the textual form above for older courses and hand-edited PGNs.
  for (const arrow of stored?.arrows ?? []) {
    const orig = validSquare(arrow.start);
    const dest = validSquare(arrow.end);
    if (orig && dest) arrows.push({ orig, dest, brush: normalizeBrush(arrow.color) });
  }
  for (const circle of stored?.circles ?? []) {
    const orig = validSquare(circle.square);
    if (orig) squareMarks.push({ orig, brush: normalizeBrush(circle.color) });
  }

  // Be tolerant of older metadata records that only retained raw directives.
  for (const directive of stored?.directives ?? []) {
    const name = directive.name.toLowerCase();
    if (name === 'repdrill-arrow' && !stored?.arrows?.length) {
      const orig = validSquare(directive.args.start ?? directive.args.from);
      const dest = validSquare(directive.args.end ?? directive.args.to);
      if (orig && dest) arrows.push({ orig, dest, brush: normalizeBrush(directive.args.color) });
    }
    if (name === 'repdrill-circle' && !stored?.circles?.length) {
      const orig = validSquare(directive.args.start ?? directive.args.square ?? directive.args.at);
      if (orig) squareMarks.push({ orig, brush: normalizeBrush(directive.args.color) });
    }
  }

  return { text, arrows, squareMarks };
}

/**
 * Stored positions are normalized to four FEN fields, but imported bundles
 * may contain a complete six-field FEN.  Never append another halfmove/full-
 * move pair: chess.js rejects that and custom starting positions disappear.
 */
export function toCompleteFen(fen: string | null | undefined): string {
  const value = (fen ?? '').trim();
  if (!value) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const fields = value.split(/\s+/);
  if (fields.length >= 6) return fields.slice(0, 6).join(' ');
  if (fields.length === 5) return `${fields.join(' ')} 1`;
  if (fields.length === 4) return `${fields.join(' ')} 0 1`;
  return value;
}
