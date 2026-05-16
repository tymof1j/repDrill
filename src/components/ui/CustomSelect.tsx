'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type CustomSelectOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  destructive?: boolean;
  separatorBefore?: boolean;
};

export function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
  compact = false,
  align = 'left',
  menuLabel,
  menuMaxHeight = 280,
  className = '',
}: {
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  compact?: boolean;
  align?: 'left' | 'right';
  menuLabel?: string;
  menuMaxHeight?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  const updateMenuRect = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gutter = 12;
    const width = Math.min(Math.max(rect.width, compact ? 220 : 280), viewportWidth - gutter * 2);
    const left = align === 'right'
      ? Math.max(gutter, Math.min(rect.right - width, viewportWidth - width - gutter))
      : Math.max(gutter, Math.min(rect.left, viewportWidth - width - gutter));
    const spaceBelow = viewportHeight - rect.bottom - gutter;
    const spaceAbove = rect.top - gutter;
    const openUp = spaceBelow < Math.min(menuMaxHeight, 180) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(menuMaxHeight, openUp ? spaceAbove - 6 : spaceBelow - 6));
    const top = openUp ? Math.max(gutter, rect.top - maxHeight - 6) : rect.bottom + 6;
    setMenuRect({ top, left, width, maxHeight });
  }, [align, compact, menuMaxHeight]);

  useEffect(() => {
    if (!open) return;
    updateMenuRect();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updateMenuRect);
    window.addEventListener('scroll', updateMenuRect, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updateMenuRect);
      window.removeEventListener('scroll', updateMenuRect, true);
    };
  }, [open, updateMenuRect]);

  const menu = open && menuRect && typeof document !== 'undefined' ? createPortal(
    <div
      ref={menuRef}
      role="listbox"
      data-custom-select-menu="true"
      style={{
        top: menuRect.top,
        left: menuRect.left,
        width: menuRect.width,
        maxHeight: menuRect.maxHeight,
      }}
      className="fixed z-[160] overflow-y-auto rounded-lg border border-[color:var(--paper-edge)] bg-[color:var(--surface)] p-1 shadow-[0_24px_70px_rgba(23,26,23,0.24)]"
    >
      {menuLabel && (
        <div className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
          {menuLabel}
        </div>
      )}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="option"
          aria-selected={option.value === value}
          onClick={() => {
            onChange(option.value);
            setOpen(false);
          }}
          className={`grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-2 rounded-md px-3 py-2 text-left transition-colors duration-150 ${
            option.separatorBefore ? 'mt-1 border-t border-[color:var(--paper-rule)] pt-3' : ''
          } ${
            option.destructive
              ? 'text-[color:var(--margin-red)] hover:bg-[color:var(--margin-red)]/10'
              : 'text-[color:var(--ink)] hover:bg-[color:var(--surface-soft)]'
          }`}
        >
          <span className="mt-0.5 h-4 w-4">
            {option.value === value && <Check size={16} />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium">{option.label}</span>
            {option.description && (
              <span className="mt-0.5 block text-[12px] font-normal leading-snug text-[color:var(--ink-soft)]">
                {option.description}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className={`${compact ? 'min-h-10 px-3 text-[13px]' : 'min-h-12 px-4 text-[14px]'} flex w-full items-center justify-between gap-3 rounded-lg border border-[color:var(--paper-edge)] bg-[color:var(--paper)] py-2 text-left font-medium text-[color:var(--ink)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-[color:var(--ink-soft)] focus-visible:border-[color:var(--library-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]/20 disabled:cursor-not-allowed disabled:opacity-60`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block truncate">{selected?.label}</span>
          {selected?.description && !compact && (
            <span className="mt-0.5 block truncate text-[12px] font-normal text-[color:var(--ink-soft)]">
              {selected.description}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[color:var(--ink-faint)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}
