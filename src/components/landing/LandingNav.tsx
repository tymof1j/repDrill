'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const navLinks = [
  { href: '#method', label: 'Method', numeral: 'II' },
  { href: '#specimen', label: 'Specimen', numeral: 'III' },
  { href: '#colophon', label: 'Colophon', numeral: 'IV' },
];

export function LandingNav({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
          scrolled
            ? 'border-[color:var(--paper-edge)] bg-[color:var(--paper)]/96 backdrop-blur-sm'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5 md:h-16 md:px-10">
          <Link
            href="/"
            className="group flex items-baseline gap-2.5 focus-visible:outline-none"
            onClick={() => setOpen(false)}
          >
            <span className="font-display text-[1.35rem] font-medium leading-none tracking-[-0.01em] text-[color:var(--ink)]">
              RepDrill
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              Vol. I
            </span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group flex items-baseline gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)] transition-colors duration-200 hover:text-[color:var(--margin-red)]"
              >
                <span className="font-display text-[11px] italic text-[color:var(--ink-faint)] group-hover:text-[color:var(--margin-red)]">
                  {link.numeral}.
                </span>
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={ctaHref}
              className="group hidden items-center gap-2 border border-[color:var(--ink)] bg-[color:var(--ink)] px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-[color:var(--paper)] transition-colors duration-200 hover:bg-[color:var(--margin-red)] hover:border-[color:var(--margin-red)] md:inline-flex"
            >
              {ctaLabel}
              <span aria-hidden className="h-px w-3 bg-current transition-all duration-200 group-hover:w-5" />
            </Link>

            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-9 w-9 items-center justify-center border border-[color:var(--ink)] transition-colors duration-200 hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)] md:hidden"
            >
              <span
                className={`absolute h-px w-4 bg-current transition-transform duration-300 ${
                  open ? 'translate-y-0 rotate-45' : '-translate-y-1.5'
                }`}
              />
              <span
                className={`absolute h-px w-4 bg-current transition-opacity duration-300 ${
                  open ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute h-px w-4 bg-current transition-transform duration-300 ${
                  open ? 'translate-y-0 -rotate-45' : 'translate-y-1.5'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-30 bg-[color:var(--paper)] transition-opacity duration-500 md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex min-h-[100dvh] flex-col justify-end px-6 pb-12 pt-24">
          <div className="space-y-6">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`group flex items-baseline gap-4 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: open ? `${120 + index * 80}ms` : '0ms' }}
              >
                <span
                  className="font-display text-2xl italic text-[color:var(--ink-faint)] group-hover:text-[color:var(--margin-red)]"
                  style={{ fontFeatureSettings: '"onum"' }}
                >
                  {link.numeral}.
                </span>
                <span className="font-display text-5xl font-medium text-[color:var(--ink)] group-hover:italic group-hover:text-[color:var(--margin-red)]">
                  {link.label}
                </span>
              </a>
            ))}
          </div>
          <Link
            href={ctaHref}
            onClick={() => setOpen(false)}
            className={`mt-12 inline-flex w-max items-center gap-3 border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.20em] text-[color:var(--paper)] transition-all duration-700 ${
              open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: open ? '380ms' : '0ms' }}
          >
            {ctaLabel}
            <span aria-hidden className="h-px w-4 bg-current" />
          </Link>
        </div>
      </div>
    </>
  );
}
