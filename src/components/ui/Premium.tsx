import Link from 'next/link';
import type { ReactNode } from 'react';

/*
 * Editorial chess-manuscript primitives.
 * No rounded "card" shadows. Hairlines, ink, paper. Mono for labels, Fraunces for display.
 * The exports keep the previous API so callers continue to work; the look is rebuilt.
 */

const motion =
  'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out';
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--margin-red)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--paper)]';

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
      className={`relative min-h-full bg-[color:var(--paper)] px-5 pb-16 pt-20 text-[color:var(--ink)] md:px-10 md:py-12 lg:px-14 ${className}`}
    >
      <div className="relative mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}

/* ─── Eyebrow / section label ──────────────────────────────────── */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
      <span aria-hidden className="h-px w-6 bg-[color:var(--paper-edge)]" />
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
    <header className="mb-10 border-b border-[color:var(--paper-edge)] pb-8 md:mb-14 md:pb-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="max-w-3xl">
          {eyebrow && <div className="mb-5">{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}</div>}
          <h1 className="font-display text-[2.75rem] font-medium leading-[1.02] tracking-[-0.01em] text-[color:var(--ink)] md:text-[4rem] lg:text-[4.75rem]">
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

/* ─── Panel — bracket-frame replaces the old soft card ─────────── */

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
      className={`relative bg-[color:var(--paper-shade)] ${bordered ? 'border border-[color:var(--paper-edge)]' : ''} ${className}`}
    >
      <div className={`relative ${innerClassName}`}>{children}</div>
    </section>
  );
}

/* ─── Diagram frame — bracket-cornered, for board panels ───────── */

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
      <div className="bracket-frame relative bg-[color:var(--paper-shade)] p-2 md:p-3">
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
  `group relative inline-flex min-h-11 items-center justify-center gap-3 border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] ${motion} hover:bg-[color:var(--margin-red)] hover:border-[color:var(--margin-red)] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

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
  `inline-flex min-h-10 items-center justify-center gap-2 border border-[color:var(--paper-edge)] bg-transparent px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink)] ${motion} hover:border-[color:var(--ink)] hover:bg-[color:var(--paper-deep)] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

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
      className={`relative inline-flex items-center px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-faint)] underline decoration-[color:var(--paper-edge)] decoration-1 underline-offset-[6px] ${motion} hover:text-[color:var(--margin-red)] hover:decoration-[color:var(--margin-red)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`mb-8 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-faint)] ${motion} hover:text-[color:var(--margin-red)] ${focusRing}`}
    >
      <span aria-hidden className="text-[color:var(--paper-edge)]">←</span>
      <span className="underline decoration-[color:var(--paper-edge)] underline-offset-[6px] hover:decoration-[color:var(--margin-red)]">
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
  'w-full rounded-none border border-[color:var(--paper-edge)] bg-[color:var(--paper)] px-3.5 py-3 text-[14px] text-[color:var(--ink)] outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-out placeholder:text-[color:var(--ink-ghost)] focus:border-[color:var(--ink)] focus:bg-[color:var(--paper-shade)] focus:ring-1 focus:ring-[color:var(--ink)]';

/* ─── Stat tile — book-style spec sheet entry ──────────────────── */

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
    <div className="border-l border-[color:var(--paper-edge)] py-1 pl-4">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-[2.25rem] font-medium leading-none tabular-nums ${toneColor}`}
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
    <div className="border border-dashed border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)] px-8 py-16 text-center">
      <p className="font-display-italic mx-auto max-w-xl text-lg leading-relaxed text-[color:var(--ink-soft)]">
        {children}
      </p>
    </div>
  );
}

/* ─── Stamp — diagonal status badge ────────────────────────────── */

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
    <span className="inline-flex items-center border border-[color:var(--ink)] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em] text-[color:var(--ink)]">
      {children}
    </span>
  );
}
