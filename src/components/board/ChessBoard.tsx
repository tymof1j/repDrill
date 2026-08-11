'use client';

import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { Key, Piece } from 'chessground/types';
import type { BoardBrushes } from '@/lib/preferences';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

export type BoardArrow = {
  orig: string;
  dest: string;
  brush?: string;
};

export type BoardSquareMark = {
  orig: string;
  brush?: string;
};

type Props = {
  fen: string;
  orientation?: 'white' | 'black';
  lastMove?: [string, string];
  viewOnly?: boolean;
  arrows?: BoardArrow[];
  squareMarks?: BoardSquareMark[];
  movable?: {
    free?: boolean;
    dests?: Map<string, string[]>;
    color?: 'white' | 'black' | 'both';
    showDests?: boolean;
  };
  premovable?: {
    enabled?: boolean;
  };
  onMove?: (orig: string, dest: string, captured?: Piece) => void;
  onPremoveSet?: (orig: string, dest: string) => void;
  brushes?: BoardBrushes;
  size?: number; // explicit px size, overrides default max-w
};

function buildAutoShapes(
  arrows?: BoardArrow[],
  squareMarks?: BoardSquareMark[],
) {
  const shapes: { orig: Key; dest?: Key; brush: string }[] = [];
  for (const m of squareMarks ?? []) {
    shapes.push({ orig: m.orig as Key, brush: m.brush ?? 'paleGreen' });
  }
  for (const a of arrows ?? []) {
    shapes.push({ orig: a.orig as Key, dest: a.dest as Key, brush: a.brush ?? 'green' });
  }
  return shapes;
}

function buildConfig(props: {
  fen: string;
  orientation: 'white' | 'black';
  viewOnly: boolean;
  lastMove?: [string, string];
  arrows?: BoardArrow[];
  squareMarks?: BoardSquareMark[];
  movable?: Props['movable'];
  premovable?: Props['premovable'];
  onMove?: Props['onMove'];
  onPremoveSet?: Props['onPremoveSet'];
  brushes?: Props['brushes'];
}): Config {
  const turnColor = props.fen.split(/\s+/)[1] === 'b' ? 'black' : 'white';
  const canMove = !props.viewOnly;
  const config: Config = {
    fen: props.fen,
    orientation: props.orientation,
    turnColor,
    // Keep Chessground's own viewOnly flag in sync with the caller.  The
    // previous implementation only disabled the movable pieces while still
    // leaving Chessground's event surface active, which made a study board
    // unexpectedly selectable on touch devices.
    viewOnly: props.viewOnly,
    disableContextMenu: true,
    // Keep a touch drag on the board from handing the gesture to the page.
    // Only interactive positions opt in; study/feedback boards remain
    // scrollable when the user starts a gesture on an empty square.
    blockTouchScroll: canMove && Boolean(props.movable?.color),
    coordinates: true,
    animation: { enabled: false, duration: 0 },
    lastMove: props.lastMove as Key[] | undefined,
    drawable: {
      enabled: true,
      eraseOnClick: true,
      defaultSnapToValidMove: false,
      autoShapes: buildAutoShapes(props.arrows, props.squareMarks),
      ...(props.brushes ? { brushes: props.brushes } : {}),
    },
    movable: {
      free: props.movable?.free ?? false,
      color: canMove ? props.movable?.color ?? undefined : undefined,
      dests: canMove ? props.movable?.dests as Map<Key, Key[]> | undefined : undefined,
      showDests: canMove ? props.movable?.showDests ?? true : false,
    },
    premovable: {
      enabled: canMove ? props.premovable?.enabled ?? true : false,
      events: canMove && props.premovable?.enabled !== false && props.onPremoveSet
        ? {
            set: (orig, dest) => props.onPremoveSet?.(orig as string, dest as string),
          }
        : undefined,
    },
    draggable: {
      enabled: canMove,
      showGhost: canMove,
    },
    selectable: {
      enabled: canMove,
    },
  };
  if (canMove && props.onMove) {
    config.events = {
      move: (orig, dest, captured) => props.onMove!(orig as string, dest as string, captured),
    };
  }
  return config;
}

export function ChessBoard({
  fen,
  orientation = 'white',
  lastMove,
  viewOnly = true,
  arrows,
  squareMarks,
  movable,
  premovable,
  onMove,
  onPremoveSet,
  brushes,
  size,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef<Props['onMove']>(onMove);
  const onPremoveSetRef = useRef<Props['onPremoveSet']>(onPremoveSet);
  const previousFenRef = useRef(fen);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    onPremoveSetRef.current = onPremoveSet;
  }, [onPremoveSet]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const config = buildConfig({
      fen,
      orientation,
      viewOnly,
      lastMove,
      arrows,
      squareMarks,
      movable,
      premovable,
      onMove: (orig, dest, captured) => onMoveRef.current?.(orig, dest, captured),
      onPremoveSet: (orig, dest) => onPremoveSetRef.current?.(orig, dest),
      brushes,
    });
    apiRef.current = Chessground(container, config);

    const ro = new ResizeObserver(() => apiRef.current?.redrawAll());
    ro.observe(container);
    previousFenRef.current = fen;

    return () => {
      ro.disconnect();
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOnly]);

  useEffect(() => {
    if (!apiRef.current) return;
    const fenChanged = previousFenRef.current !== fen;
    apiRef.current.set({
      ...(fenChanged ? { fen } : {}),
      orientation,
      ...(fenChanged ? { turnColor: fen.split(/\s+/)[1] === 'b' ? 'black' : 'white' } : {}),
      viewOnly,
      disableContextMenu: true,
      blockTouchScroll: !viewOnly && Boolean(movable?.color),
      animation: { enabled: false, duration: 0 },
      lastMove: lastMove as Key[] | undefined,
      drawable: {
        enabled: true,
        eraseOnClick: true,
        defaultSnapToValidMove: false,
        autoShapes: buildAutoShapes(arrows, squareMarks),
        ...(brushes ? { brushes } : {}),
      },
      movable: {
        free: movable?.free ?? false,
        color: !viewOnly ? movable?.color ?? undefined : undefined,
        dests: !viewOnly ? movable?.dests as Map<Key, Key[]> | undefined : undefined,
        showDests: !viewOnly ? movable?.showDests ?? true : false,
      },
      premovable: {
        enabled: !viewOnly ? premovable?.enabled ?? true : false,
        events: !viewOnly && premovable?.enabled !== false
          ? {
              set: (orig, dest) => onPremoveSetRef.current?.(orig as string, dest as string),
            }
          : undefined,
      },
      draggable: {
        enabled: !viewOnly,
        showGhost: !viewOnly,
      },
      selectable: {
        // Chessground supports both drag-and-drop and click-source/click-
        // target moves when selectable and draggable are enabled together.
        enabled: !viewOnly,
      },
    });
    previousFenRef.current = fen;
    apiRef.current.playPremove();
  }, [fen, orientation, viewOnly, lastMove, arrows, squareMarks, movable, premovable, brushes]);

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-none"
      style={size ? { width: `${size}px` } : undefined}
    >
      <div
        ref={containerRef}
        className="cg-wrap h-full w-full"
        data-board-view-only={viewOnly ? 'true' : undefined}
      />
    </div>
  );
}
