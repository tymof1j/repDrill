import Link from 'next/link';
import type { ReactNode } from 'react';

const motion =
  'transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ease-out';
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3c7]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1214]';

export function AppSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`min-h-full bg-[#0b1214] px-4 pb-8 pt-24 text-[#edf5f2] md:px-8 md:py-10 ${className}`}>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md border border-[#7dd3c7]/18 bg-[#7dd3c7]/[0.09] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a8e7df]">
      {children}
    </span>
  );
}

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
    <div className="mb-7 flex flex-col gap-5 md:mb-9 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-normal text-[#f4faf7] md:text-5xl">
          {title}
        </h1>
        {body && <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aebdb8] md:text-base">{body}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div>}
    </div>
  );
}

export function PremiumPanel({
  children,
  className = '',
  innerClassName = '',
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#263337] bg-[#182225] p-1 shadow-[0_18px_48px_rgba(0,0,0,0.24),inset_0_1px_1px_rgba(255,255,255,0.06)] ${className}`}
    >
      <div
        className={`h-full rounded-[0.875rem] bg-[#10191b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

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
  const classes = `group inline-flex min-h-11 items-center justify-center gap-3 rounded-xl bg-[#7dd3c7] px-4 py-2.5 text-sm font-semibold text-[#071314] shadow-[0_10px_24px_rgba(125,211,199,0.14)] ${motion} hover:bg-[#a8e7df] hover:shadow-[0_12px_28px_rgba(125,211,199,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${className}`;
  const content = (
    <>
      {children}
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-[#071314]/[0.10] ${motion} group-hover:translate-x-0.5 group-hover:-translate-y-[1px]`}>
        ↗
      </span>
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
  const classes = `inline-flex min-h-10 items-center justify-center rounded-xl border border-[#2b3a3e] bg-[#172225] px-4 py-2.5 text-sm font-semibold text-[#e6f1ed] ${motion} hover:border-[#496066] hover:bg-[#1d2b2f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${className}`;

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
      className={`rounded-lg px-3 py-2 text-xs font-semibold text-[#9fb0aa] ${motion} hover:bg-[#223034] hover:text-[#f4faf7] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`mb-6 inline-flex rounded-lg border border-[#2b3a3e] bg-[#172225] px-3 py-2 text-xs font-semibold text-[#9fb0aa] ${motion} hover:bg-[#223034] hover:text-[#f4faf7] ${focusRing}`}
    >
      ← {children}
    </Link>
  );
}

export function FieldLabel({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#8fa3a0]">
        {label}
        {required && <span className="ml-1 text-[#ff9f8e]">*</span>}
      </span>
      {children}
    </label>
  );
}

export const fieldClassName =
  'w-full rounded-xl border border-[#2b3a3e] bg-[#172225] px-4 py-3 text-sm text-[#f4faf7] outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-out placeholder:text-[#6f807c] focus:border-[#7dd3c7]/70 focus:bg-[#1d2b2f] focus:ring-2 focus:ring-[#7dd3c7]/20';

export function StatTile({
  label,
  value,
  tone = 'cream',
}: {
  label: string;
  value: ReactNode;
  tone?: 'cream' | 'green' | 'red' | 'gold';
}) {
  const toneClass =
    tone === 'green'
      ? 'text-[#8ee6ae]'
      : tone === 'red'
        ? 'text-[#ff9f8e]'
        : tone === 'gold'
          ? 'text-[#f1cc7a]'
          : 'text-[#f4faf7]';

  return (
    <div className="rounded-xl border border-[#263337] bg-[#152023] p-4">
      <p className="text-xs font-medium text-[#8fa3a0]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <PremiumPanel>
      <div className="p-8 text-center text-sm leading-6 text-[#aebdb8] md:p-12">{children}</div>
    </PremiumPanel>
  );
}
