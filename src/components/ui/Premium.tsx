import Link from 'next/link';
import type { ReactNode } from 'react';

/*
 * Shared RepDrill primitives.
 * The exports keep the previous API so callers continue to work while the
 * visual language moves toward a quieter modern product surface.
 */

const motion =
  'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out';
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--paper)]';

/* ─── Page surface ─────────────────────────────────────────────── */

export function AppSurface({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative min-h-full bg-[color:var(--paper)] pb-16 pt-20 text-[color:var(--ink)] [padding-inline:20px] md:py-12 md:[padding-inline:40px] lg:[padding-inline:var(--app-shell-gutter-lg,56px)] ${className}`}
    >
      <div
        className="app-shell-inner relative mx-auto w-full max-w-[var(--app-shell-max-width,72rem)]"
        style={{ transform: 'translateX(var(--content-shift-x, 0px))' }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Eyebrow / section label ──────────────────────────────────── */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--library-green)]" />
      {children}
    </span>
  );
}

/* ─── Page header ──────────────────────────────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-10 border-b border-[color:var(--paper-rule)] pb-8 md:mb-14 md:pb-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="max-w-3xl">
          {eyebrow && <div className="mb-5">{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}</div>}
          <h1 className="font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.03em] text-[color:var(--ink)] md:text-[4rem] lg:text-[4.75rem]">
            {title}
          </h1>
          {body && (
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[color:var(--ink-soft)] md:text-base">
              {body}
            </p>
          )}
        </div>
        {action && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 md:pb-2">{action}</div>
        )}
      </div>
    </header>
  );
}

/* ─── Panel ────────────────────────────────────────────────────── */

export function PremiumPanel({
  children,
  className = '',
  innerClassName = '',
  bordered = true,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  bordered?: boolean;
}) {
  return (
    <section
      className={`relative rounded-lg bg-[color:var(--surface)] shadow-[0_18px_55px_rgba(47,58,50,0.08)] ${bordered ? 'border border-[color:var(--paper-rule)]' : ''} ${className}`}
    >
      <div className={`relative ${innerClassName}`}>{children}</div>
    </section>
  );
}

/* ─── Diagram frame ────────────────────────────────────────────── */

export function DiagramFrame({
  children,
  caption,
  className = '',
}: {
  children: ReactNode;
  caption?: ReactNode;
  className?: string;
}) {
  return (
    <figure className={`relative ${className}`}>
      <div className="bracket-frame relative bg-[color:var(--surface)] p-2 shadow-[0_18px_55px_rgba(47,58,50,0.10)] md:p-3">
        <span className="bracket-tl" />
        <span className="bracket-tr" />
        <span className="bracket-bl" />
        <span className="bracket-br" />
        {children}
      </div>
      {caption && (
        <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* ─── Buttons ──────────────────────────────────────────────────── */

const primaryClasses =
  `group relative inline-flex min-h-11 items-center justify-center gap-3 rounded-md border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:var(--paper)] shadow-[0_10px_30px_rgba(23,26,23,0.14)] ${motion} hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--library-green)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export function PremiumButton({
  children,
  href,
  type = 'button',
  disabled,
  onClick,
  className = '',
}: {
  children: ReactNode;
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const classes = `${primaryClasses} ${className}`;
  const content = (
    <>
      <span>{children}</span>
      <span
        aria-hidden
        className={`inline-flex h-px w-4 bg-current transition-all duration-200 group-hover:w-7`}
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

const secondaryClasses =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.13em] text-[color:var(--ink)] ${motion} hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--surface)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export function SecondaryButton({
  children,
  href,
  type = 'button',
  disabled,
  onClick,
  className = '',
}: {
  children: ReactNode;
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const classes = `${secondaryClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  type = 'button',
  disabled,
  onClick,
  className = '',
}: {
  children: ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex items-center rounded-md px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[6px] ${motion} hover:text-[color:var(--library-green)] hover:decoration-[color:var(--library-green)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`mb-8 inline-flex items-center gap-2 rounded-md font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-faint)] ${motion} hover:text-[color:var(--library-green)] ${focusRing}`}
    >
      <span aria-hidden className="text-[color:var(--paper-edge)]">←</span>
      <span className="underline decoration-[color:var(--paper-edge)] underline-offset-[6px] hover:decoration-[color:var(--library-green)]">
        {children}
      </span>
    </Link>
  );
}

/* ─── Form helpers ─────────────────────────────────────────────── */

export function FieldLabel({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
        <span>
          {label}
          {required && <span className="ml-1 text-[color:var(--margin-red)]">*</span>}
        </span>
        {hint && (
          <span className="font-mono text-[10px] tracking-[0.14em] text-[color:var(--ink-ghost)] normal-case">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

export const fieldClassName =
  'w-full rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-3.5 py-3 text-[14px] text-[color:var(--ink)] outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-out placeholder:text-[color:var(--ink-ghost)] focus:border-[color:var(--library-green)] focus:bg-[color:var(--surface)] focus:ring-2 focus:ring-[color:var(--library-green)]/20';

/* ─── Stat tile ────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  tone = 'cream',
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: 'cream' | 'green' | 'red' | 'gold';
  hint?: ReactNode;
}) {
  const toneColor =
    tone === 'green'
      ? 'text-[color:var(--library-green)]'
      : tone === 'red'
        ? 'text-[color:var(--margin-red)]'
        : tone === 'gold'
          ? 'text-[color:var(--gilt)]'
          : 'text-[color:var(--ink)]';

  return (
    <div className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-4 py-4 shadow-[0_14px_36px_rgba(47,58,50,0.06)]">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-[2.25rem] font-semibold leading-none tracking-[-0.03em] tabular-nums ${toneColor}`}
        style={{ fontFeatureSettings: '"onum"' }}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-ghost)]">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ─── Empty state ──────────────────────────────────────────────── */

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--paper-edge)] bg-[color:var(--surface-soft)] px-8 py-16 text-center">
      <p className="font-display-italic mx-auto max-w-xl text-lg leading-relaxed text-[color:var(--ink-soft)]">
        {children}
      </p>
    </div>
  );
}

/* ─── Status badge ─────────────────────────────────────────────── */

export function Stamp({
  children,
  tone = 'red',
  rotate = false,
}: {
  children: ReactNode;
  tone?: 'red' | 'green' | 'gold' | 'ink';
  rotate?: boolean;
}) {
  const color =
    tone === 'green'
      ? 'text-[color:var(--library-green)]'
      : tone === 'gold'
        ? 'text-[color:var(--gilt)]'
        : tone === 'ink'
          ? 'text-[color:var(--ink)]'
          : 'text-[color:var(--margin-red)]';
  return (
    <span className={`stamp ${rotate ? 'stamp-rotate' : ''} ${color}`}>{children}</span>
  );
}

/* ─── Section divider ──────────────────────────────────────────── */

export function BookDivider({ symbol = '§' }: { symbol?: string }) {
  return (
    <div className="book-divider my-12 font-display-italic text-base text-[color:var(--paper-edge)]">
      <span aria-hidden>{symbol}</span>
    </div>
  );
}

/* ─── ECO-style code chip ──────────────────────────────────────── */

export function EcoCode({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-[color:var(--paper-edge)] bg-[color:var(--surface-soft)] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em] text-[color:var(--ink)]">
      {children}
    </span>
  );
}
