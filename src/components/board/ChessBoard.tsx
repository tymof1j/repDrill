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

type Props = {
  fen: string;
  orientation?: 'white' | 'black';
  lastMove?: [string, string];
  viewOnly?: boolean;
  arrows?: BoardArrow[];
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
};

function buildConfig(props: {
  fen: string;
  orientation: 'white' | 'black';
  viewOnly: boolean;
  lastMove?: [string, string];
  arrows?: BoardArrow[];
  movable?: Props['movable'];
  premovable?: Props['premovable'];
  onMove?: Props['onMove'];
}): Config {
  const turnColor = props.fen.split(/\s+/)[1] === 'b' ? 'black' : 'white';
  const config: Config = {
    fen: props.fen,
    orientation: props.orientation,
    turnColor,
    viewOnly: props.viewOnly,
    coordinates: true,
    animation: { enabled: true, duration: 200 },
    lastMove: props.lastMove as Key[] | undefined,
    drawable: {
      enabled: true,
      autoShapes: props.arrows?.map((a) => ({
        orig: a.orig as Key,
        dest: a.dest as Key,
        brush: a.brush ?? 'green',
      })) ?? [],
    },
    movable: {
      free: false,
      color: props.movable?.color ?? undefined,
      dests: props.movable?.dests as Map<Key, Key[]> | undefined,
      showDests: props.movable?.showDests ?? true,
    },
    premovable: {
      enabled: props.premovable?.enabled ?? false,
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
  movable,
  premovable,
  onMove,
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
      movable,
      premovable,
      onMove: (orig, dest, captured) => onMoveRef.current?.(orig, dest, captured),
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
      lastMove: lastMove as Key[] | undefined,
      drawable: {
        autoShapes: arrows?.map((a) => ({
          orig: a.orig as Key,
          dest: a.dest as Key,
          brush: a.brush ?? 'green',
        })) ?? [],
      },
      movable: {
        free: false,
        color: movable?.color ?? undefined,
        dests: movable?.dests as Map<Key, Key[]> | undefined,
        showDests: movable?.showDests ?? true,
      },
      premovable: {
        enabled: premovable?.enabled ?? false,
      },
    });
  }, [fen, orientation, viewOnly, lastMove, arrows, movable, premovable]);

  return (
    <div className="mx-auto aspect-square w-full max-w-[480px]">
      <div ref={containerRef} className="cg-wrap h-full w-full" />
    </div>
  );
}
