'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

export type CourseKind = 'opening' | 'theory' | 'puzzles';

export type CourseMeta = {
  kind: CourseKind;
  kindLabel: string;
  openingLabel: string;
  theoryLabels: string[];
  shortDescription: string;
};

const COURSE_COVER_ROOT = '/course-covers';

/**
 * Resolve the editorial cover art without requiring a cover field on every
 * course document. Built-in courses get their own artwork, while user-made
 * courses use the taxonomy-specific defaults when one is available.
 */
export function getCourseCoverUrl(name: string, kind: CourseKind): string | null {
  const normalizedName = name.trim().toLowerCase().replace(/[–—-]+/g, ' ').replace(/\s+/g, ' ');

  if (normalizedName.includes('english breakfast')) {
    return `${COURSE_COVER_ROOT}/english-breakfast.png`;
  }
  if (normalizedName.includes('woodpecker') && /(?:method\s*2|\b2\b)/.test(normalizedName)) {
    return `${COURSE_COVER_ROOT}/woodpecker-method-2.png`;
  }
  if (normalizedName.includes('woodpecker')) {
    return `${COURSE_COVER_ROOT}/woodpecker-method.png`;
  }
  if (kind === 'opening') return `${COURSE_COVER_ROOT}/opening-default.png`;
  if (kind === 'theory') return `${COURSE_COVER_ROOT}/theory-default.png`;
  return null;
}

/**
 * Keep course taxonomy close to the presentation layer. The Convex course
 * document intentionally stays small, so this is a conservative classifier
 * over the course title/description and can be replaced with persisted tags
 * later without changing the cards.
 */
export function getCourseMeta(
  name: string,
  description?: string | null,
  mode?: 'theory' | 'puzzles',
): CourseMeta {
  const text = `${name} ${description ?? ''}`.toLowerCase();
  const isPuzzle = mode === 'puzzles';

  let openingLabel = 'Opening repertoire';
  if (text.includes('english')) openingLabel = 'English Opening';
  else if (text.includes('sicilian')) openingLabel = 'Sicilian Defence';
  else if (text.includes('nimzo')) openingLabel = 'Nimzo-Indian Defence';
  else if (text.includes('french')) openingLabel = 'French Defence';
  else if (text.includes('caro')) openingLabel = 'Caro-Kann Defence';
  else if (text.includes('queen')) openingLabel = 'Queen’s Pawn';
  else if (text.includes('woodpecker')) openingLabel = 'Calculation training';

  const kind: CourseKind = isPuzzle ? 'puzzles' : text.includes('opening') || text.includes('repertoire') || text.includes('defence') || text.includes('sicilian') || text.includes('english') ? 'opening' : 'theory';
  const kindLabel = kind === 'puzzles' ? 'Puzzle course' : kind === 'opening' ? 'Opening course' : 'Theory course';
  const theoryLabels = kind === 'puzzles'
    ? ['Calculation', 'Pattern recall']
    : kind === 'opening'
      ? ['Repertoire', 'Move-order awareness', 'Spaced recall']
      : ['Plans & ideas', 'Critical positions', 'Spaced recall'];

  return {
    kind,
    kindLabel,
    openingLabel,
    theoryLabels,
    shortDescription:
      description?.trim() ||
      (kind === 'puzzles'
        ? 'Solve positions, recognize the pattern, and build a repeatable calculation habit.'
        : 'Learn the critical positions, then return to them until the ideas become playable.'),
  };
}

export function formatFenSummary(fen: string | null | undefined) {
  if (!fen) return 'FEN not available';
  const fields = fen.trim().split(/\s+/);
  const side = fields[1] === 'b' ? 'Black to move' : 'White to move';
  const castling = fields[2] && fields[2] !== '-' ? `Castling ${fields[2]}` : 'No castling rights';
  const enPassant = fields[3] && fields[3] !== '-' ? `En passant ${fields[3]}` : 'No en passant';
  return `${side} · ${castling} · ${enPassant}`;
}

export function CourseCover({
  name,
  kind,
  compact = false,
  coverUrl,
  children,
}: {
  name: string;
  kind: CourseKind;
  compact?: boolean;
  coverUrl?: string | null;
  children?: ReactNode;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || 'R';
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedCoverUrl = coverUrl?.trim() || getCourseCoverUrl(name, kind);
  const showCoverArt = Boolean(resolvedCoverUrl) && !imageFailed;

  return (
    <div
      className={`course-cover relative isolate overflow-hidden border border-white/15 bg-[#20362f] text-[#f7f6f1] shadow-[0_18px_42px_rgba(29,47,39,0.18)] ${compact ? 'aspect-[1.55] rounded-[1.25rem]' : 'aspect-[1.24] rounded-[1.5rem]'}`}
      data-course-cover={kind}
      role="img"
      aria-label={`${name} course cover`}
    >
      {showCoverArt && resolvedCoverUrl && (
        <Image
          src={resolvedCoverUrl}
          alt={`${name} course cover`}
          fill
          sizes={compact ? '(min-width: 1280px) 25vw, (min-width: 768px) 42vw, 100vw' : '(min-width: 1024px) 34vw, 100vw'}
          loading={compact ? 'lazy' : 'eager'}
          className="object-cover object-center"
          onError={() => setImageFailed(true)}
        />
      )}
      <div aria-hidden className={`absolute inset-0 ${showCoverArt ? 'bg-[#142820]/45' : 'bg-[#20362f]/10'}`} />
      <div aria-hidden className={`absolute inset-0 ${showCoverArt ? 'opacity-35' : 'opacity-90'} [background-image:linear-gradient(135deg,rgba(255,255,255,0.10)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.07)_50%,rgba(255,255,255,0.07)_75%,transparent_75%)] [background-size:4.4rem_4.4rem]`} />
      <div aria-hidden className="absolute -right-12 -top-16 h-44 w-44 rounded-full border border-white/20 opacity-70" />
      <div aria-hidden className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full border border-[#c8a96a]/35" />
      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-[#c8d8cb]">
            RepDrill · Study edition
          </span>
          <span className="rounded-full border border-[#c8d8cb]/35 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#c8d8cb]">
            {kind === 'puzzles' ? 'Solve' : 'Learn'}
          </span>
        </div>
        <div>
          <span className="font-display text-5xl font-semibold tracking-[-0.08em] text-[#e6cf96] sm:text-6xl">{initial}</span>
          {!compact && (
            <p className="mt-2 max-w-[18ch] font-display text-lg font-medium leading-tight text-[#f7f6f1]">
              {name}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = 'green',
  label,
}: {
  value: number;
  tone?: 'green' | 'gold' | 'red';
  label?: string;
}) {
  const width = Math.max(0, Math.min(100, Math.round(value)));
  const fill = tone === 'gold' ? 'bg-[#c8a96a]' : tone === 'red' ? 'bg-[#c06b5c]' : 'bg-[#3f806b]';
  return (
    <div className="space-y-2">
      {label && <div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">Progress</span><span className="font-mono text-[10px] font-semibold tabular-nums text-[color:var(--ink-soft)]">{label}</span></div>}
      <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--paper-deep)]" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${fill} transition-[width] duration-500 ease-out`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
