'use client';

import Link from 'next/link';
import { useState } from 'react';

const navLinks = [
  { href: '#training', label: 'Training' },
  { href: '#analysis', label: 'Analysis' },
  { href: '#stack', label: 'Stack' },
];

export function LandingNav({ ctaHref }: { ctaHref: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed left-1/2 top-0 z-40 w-[min(92vw,760px)] -translate-x-1/2 pt-5">
        <nav className="mx-auto flex h-14 items-center justify-between rounded-full border border-white/10 bg-[#080807]/70 px-3 pl-5 text-[#f8f1df] shadow-[0_22px_80px_rgba(0,0,0,0.28),inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-2xl">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.22em] text-[#fff8e6] uppercase"
            onClick={() => setOpen(false)}
          >
            RepDrill
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-xs font-medium text-[#c9c0aa] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.08] hover:text-[#fff8e6]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={ctaHref}
              className="group hidden items-center gap-3 rounded-full bg-[#f8f1df] px-3 py-2 pl-5 text-xs font-semibold text-[#0b0b09] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] md:inline-flex"
            >
              Open app
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b0b09]/[0.08] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
                ↗
              </span>
            </Link>

            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.96] md:hidden"
            >
              <span
                className={`absolute h-px w-4 bg-[#f8f1df] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  open ? 'translate-y-0 rotate-45' : '-translate-y-1.5 rotate-0'
                }`}
              />
              <span
                className={`absolute h-px w-4 bg-[#f8f1df] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  open ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute h-px w-4 bg-[#f8f1df] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  open ? 'translate-y-0 -rotate-45' : 'translate-y-1.5 rotate-0'
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      <div
        className={`fixed inset-0 z-30 bg-[#050504]/[0.88] backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-8 opacity-0'
        }`}
      >
        <div className="flex min-h-[100dvh] flex-col justify-end px-6 pb-12 pt-28">
          <div className="space-y-4">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block overflow-hidden text-5xl font-semibold tracking-normal text-[#f8f1df] transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                }`}
                style={{ transitionDelay: open ? `${120 + index * 70}ms` : '0ms' }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <Link
            href={ctaHref}
            onClick={() => setOpen(false)}
            className={`group mt-10 inline-flex w-max items-center gap-3 rounded-full bg-[#f8f1df] px-3 py-3 pl-6 text-sm font-semibold text-[#0b0b09] transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
              open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
            style={{ transitionDelay: open ? '360ms' : '0ms' }}
          >
            Open app
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b0b09]/[0.08] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
              ↗
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
