'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const navLinks = [
  { href: '#use-cases', label: 'Use cases' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#benefits', label: 'Benefits' },
  { href: '#ownership', label: 'Ownership' },
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
            ? 'border-[color:var(--paper-rule)] bg-[color:var(--paper)]/88 backdrop-blur-xl'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-10 lg:px-14">
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
            onClick={() => setOpen(false)}
          >
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--ink)] text-[13px] font-semibold text-[color:var(--paper)]">
              R
            </span>
            <span className="font-display text-base font-semibold leading-none tracking-[-0.02em] text-[color:var(--ink)]">
              RepDrill
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)]/72 p-1 shadow-[0_10px_30px_rgba(47,58,50,0.06)] md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-[13px] font-medium text-[color:var(--ink-soft)] transition-colors duration-200 hover:bg-[color:var(--paper-shade)] hover:text-[color:var(--ink)]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={ctaHref}
              className="group hidden min-h-10 items-center gap-2 rounded-md border border-[color:var(--ink)] bg-[color:var(--ink)] px-4 py-2 text-[13px] font-semibold text-[color:var(--paper)] shadow-[0_10px_30px_rgba(23,26,23,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--library-green)] md:inline-flex"
            >
              {ctaLabel}
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </Link>

            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface)] transition-colors duration-200 hover:border-[color:var(--ink)] md:hidden"
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
          <div className="space-y-3">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center justify-between rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--surface)] px-5 py-4 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: open ? `${120 + index * 80}ms` : '0ms' }}
              >
                <span className="font-display text-3xl font-semibold tracking-[-0.03em] text-[color:var(--ink)] group-hover:text-[color:var(--library-green)]">
                  {link.label}
                </span>
                <span aria-hidden className="text-[color:var(--ink-faint)]">→</span>
              </a>
            ))}
          </div>
          <Link
            href={ctaHref}
            onClick={() => setOpen(false)}
            className={`mt-12 inline-flex w-max items-center gap-3 rounded-md border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 py-3 text-[13px] font-semibold text-[color:var(--paper)] transition-all duration-700 ${
              open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: open ? '380ms' : '0ms' }}
          >
            {ctaLabel}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
