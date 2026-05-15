'use client';

import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { Key, Piece } from 'chessground/types';
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
}): Config {
  const turnColor = props.fen.split(/\s+/)[1] === 'b' ? 'black' : 'white';
  const config: Config = {
    fen: props.fen,
    orientation: props.orientation,
    turnColor,
    viewOnly: props.viewOnly,
    coordinates: true,
    animation: { enabled: false, duration: 0 },
    lastMove: props.lastMove as Key[] | undefined,
    drawable: {
      enabled: true,
      autoShapes: buildAutoShapes(props.arrows, props.squareMarks),
    },
    movable: {
      free: false,
      color: props.movable?.color ?? undefined,
      dests: props.movable?.dests as Map<Key, Key[]> | undefined,
      showDests: props.movable?.showDests ?? true,
    },
    premovable: {
      enabled: props.premovable?.enabled ?? true,
      events: props.onPremoveSet
        ? {
            set: (orig, dest) => props.onPremoveSet?.(orig as string, dest as string),
          }
        : undefined,
    },
  };
  if (props.onMove) {
    config.events = {
      move: (orig, dest, captured) =>
        props.onMove!(orig as string, dest as string, captured),
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
  size,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef<Props['onMove']>(onMove);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    if (!containerRef.current) return;
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
      onPremoveSet,
    });
    apiRef.current = Chessground(containerRef.current, config);

    const ro = new ResizeObserver(() => apiRef.current?.redrawAll());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOnly]);

  useEffect(() => {
    if (!apiRef.current) return;
    apiRef.current.set({
      fen,
      orientation,
      turnColor: fen.split(/\s+/)[1] === 'b' ? 'black' : 'white',
      viewOnly,
      animation: { enabled: false, duration: 0 },
      lastMove: lastMove as Key[] | undefined,
      drawable: {
        autoShapes: buildAutoShapes(arrows, squareMarks),
      },
      movable: {
        free: false,
        color: movable?.color ?? undefined,
        dests: movable?.dests as Map<Key, Key[]> | undefined,
        showDests: movable?.showDests ?? true,
      },
      premovable: {
        enabled: premovable?.enabled ?? true,
        events: onPremoveSet
          ? {
              set: (orig, dest) => onPremoveSet(orig as string, dest as string),
            }
          : undefined,
      },
    });
    apiRef.current.playPremove();
  }, [fen, orientation, viewOnly, lastMove, arrows, squareMarks, movable, premovable, onPremoveSet]);

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-none"
      style={size ? { width: `${size}px` } : undefined}
    >
      <div ref={containerRef} className="cg-wrap h-full w-full" />
    </div>
  );
}
