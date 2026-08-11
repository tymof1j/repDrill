'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  caption?: ReactNode;
  className?: string;
  storageKey?: string;
  /** Clamp a persisted board size to the visible desktop training viewport. */
  fitViewport?: boolean;
};

const MIN_SIZE = 280;
const DEFAULT_SIZE = 680;
const STORAGE_KEY = 'repdrill:board-size';
const LG_GUTTER_MAX = 56;
const LG_GUTTER_MIN = 20;
const RIGHT_COLUMN_RESERVE = 360;
const FRAME_GAP = 24;
const SHELL_MAX_MIN = 1152; // 72rem
const SHELL_MAX_BOOST = 420;
const SHIFT_MAX_PX = 78;
// Training controls now live beside the board on desktop, so only the frame
// caption and a small breathing room need to remain visible beneath it.
const VIEWPORT_BOTTOM_RESERVE = 56;

export function ResizableDiagramFrame({
  children,
  caption,
  className = '',
  storageKey = STORAGE_KEY,
  fitViewport = false,
}: Props) {
  const [size, setSize] = useState<number | null>(null);
  const [resizableEnabled, setResizableEnabled] = useState(false);
  const [viewportMaxSize, setViewportMaxSize] = useState<number | null>(null);
  const figureRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      const enabled = mediaQuery.matches;
      setResizableEnabled(enabled);
      if (!enabled) {
        setSize(null);
        return;
      }
      let initial: number | null = null;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && parsed >= MIN_SIZE) initial = Math.max(parsed, DEFAULT_SIZE);
        }
      } catch {
        // ignore
      }
      setSize(initial ?? DEFAULT_SIZE);
    };
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, [storageKey]);

  useEffect(() => {
    if (!resizableEnabled || !fitViewport) {
      const frame = window.requestAnimationFrame(() => setViewportMaxSize(null));
      return () => window.cancelAnimationFrame(frame);
    }
    let frame = 0;
    const sync = () => {
      const element = figureRef.current;
      if (!element) return;
      // Use the document position rather than the current scroll offset. The
      // cap must be stable even when a user arrives here from a previously
      // scrolled training session.
      const scrollTop = document.getElementById('main-content')?.scrollTop ?? window.scrollY;
      const top = element.getBoundingClientRect().top + scrollTop;
      const shellWidth = document.querySelector<HTMLElement>('.app-shell-inner')?.clientWidth ?? window.innerWidth;
      const widthMax = Math.max(MIN_SIZE, Math.floor(shellWidth - RIGHT_COLUMN_RESERVE - FRAME_GAP));
      const heightMax = Math.max(MIN_SIZE, Math.floor(window.innerHeight - top - VIEWPORT_BOTTOM_RESERVE));
      setViewportMaxSize(Math.min(widthMax, heightMax));
    };
    const requestSync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(sync);
    };
    requestSync();
    window.addEventListener('resize', requestSync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', requestSync);
    };
  }, [fitViewport, resizableEnabled]);

  const displaySize = size && viewportMaxSize
    ? Math.min(size, viewportMaxSize)
    : size;

  useEffect(() => {
    if (!resizableEnabled || !displaySize) return;
    const t = Math.max(0, Math.min(1, (displaySize - 560) / 520));
    const gutter = Math.round(LG_GUTTER_MAX - t * (LG_GUTTER_MAX - LG_GUTTER_MIN));
    const shellMax = Math.round(SHELL_MAX_MIN + t * SHELL_MAX_BOOST);
    const shift = Math.round(t * SHIFT_MAX_PX);
    document.documentElement.style.setProperty('--app-shell-gutter-lg', `${gutter}px`);
    document.documentElement.style.setProperty('--app-shell-max-width', `${shellMax}px`);
    document.documentElement.style.setProperty('--content-shift-x', `-${shift}px`);
    return () => {
      document.documentElement.style.removeProperty('--app-shell-gutter-lg');
      document.documentElement.style.removeProperty('--app-shell-max-width');
      document.documentElement.style.removeProperty('--content-shift-x');
    };
  }, [resizableEnabled, displaySize]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizableEnabled) return;
    event.preventDefault();

    const frame = event.currentTarget.closest('[data-diagram-frame]') as HTMLDivElement | null;
    if (!frame) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const currentSize = Math.round(frame.getBoundingClientRect().width);
    const shellWidth =
      document.querySelector<HTMLElement>('.app-shell-inner')?.clientWidth ?? window.innerWidth;
    const widthMaxSize = Math.max(
      MIN_SIZE,
      Math.floor(shellWidth - RIGHT_COLUMN_RESERVE - FRAME_GAP),
    );
    const maxSize = viewportMaxSize
      ? Math.min(widthMaxSize, viewportMaxSize)
      : widthMaxSize;

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = Math.max(moveEvent.clientX - startX, moveEvent.clientY - startY);
      const next = Math.max(MIN_SIZE, Math.min(maxSize, currentSize + delta));
      setSize(next);
      try {
        window.localStorage.setItem(storageKey, String(next));
      } catch {
        // ignore storage failures
      }
    };
    const onPointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <figure
      ref={figureRef}
      className={`relative ${className}`}
      style={
        resizableEnabled && displaySize
          ? {
              width: `${displaySize}px`,
            }
          : undefined
      }
    >
      <div
        data-diagram-frame
        className="bracket-frame relative bg-[color:var(--surface)] p-2 shadow-[0_18px_55px_rgba(47,58,50,0.10)] md:p-3"
      >
        <span className="bracket-tl" />
        <span className="bracket-tr" />
        <span className="bracket-bl" />
        <span className="bracket-br" />
        {children}
        {resizableEnabled && (
          <button
            type="button"
            aria-label="Resize board"
            title="Drag to resize board"
            onPointerDown={handleResizeStart}
            className="absolute bottom-0 right-0 z-20 h-3.5 w-3.5 translate-x-[40%] translate-y-[40%] cursor-se-resize touch-none border border-[color:var(--ink)]/70 bg-[color:var(--surface)] p-0 shadow-[0_1px_3px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--margin-red)]"
          />
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
