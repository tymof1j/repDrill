'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { setSharingAction } from '../actions';

type Audience = 'restricted' | 'link';

export function SharePanel({
  courseId,
  courseName,
  isPublic: initialIsPublic,
  shareToken: initialToken,
  ownerLabel,
}: {
  courseId: string;
  courseName: string;
  isPublic: boolean;
  shareToken: string | null;
  ownerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [token, setToken] = useState(initialToken);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const audience: Audience = isPublic ? 'link' : 'restricted';
  const ownerName = ownerLabel ?? 'You';
  const ownerInitial = (ownerName.trim()[0] ?? 'Y').toUpperCase();

  const fullUrl =
    typeof window !== 'undefined' && token
      ? `${window.location.origin}/share/${token}`
      : token
        ? `/share/${token}`
        : '';

  useEffect(() => {
    setPortalEl(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!dialogRef.current) return;
      if (dialogRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
    }
  }, [open]);

  const submit = (intent: 'enable' | 'disable' | 'rotate') => {
    const fd = new FormData();
    fd.set('courseId', courseId);
    fd.set('intent', intent);
    start(async () => {
      const res = await setSharingAction(fd);
      setIsPublic(res.isPublic);
      setToken(res.token);
    });
  };

  const changeAudience = (next: Audience) => {
    if (next === 'link' && !isPublic) submit('enable');
    if (next === 'restricted' && isPublic) submit('disable');
  };

  const copy = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-[color:var(--paper-rule)] bg-[color:var(--paper)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)] transition-colors duration-200 hover:bg-[color:var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--paper)]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ShareIcon />
        Share
      </button>

      {open && portalEl && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--ink)]/40 px-4 py-6 backdrop-blur-[2px]"
          aria-hidden={!open}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
            className="w-full max-w-[560px] overflow-hidden rounded-xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)] shadow-[0_28px_80px_rgba(23,26,23,0.25)]"
          >
            <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
              <h2
                id="share-dialog-title"
                className="font-display text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[color:var(--ink)]"
              >
                Share <span className="font-display-italic font-normal">“{courseName}”</span>
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-2 -mt-1 grid h-9 w-9 place-items-center rounded-full text-[color:var(--ink-soft)] transition-colors duration-200 hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div className="px-6 pb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                People with access
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--ink)] text-[12px] font-bold text-[color:var(--paper)]">
                  {ownerInitial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[color:var(--ink)]">
                    {ownerName} <span className="text-[color:var(--ink-faint)]">(you)</span>
                  </span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                  Owner
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-[color:var(--paper-rule)] px-6 pt-5 pb-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                General access
              </p>

              <div className="mt-3 flex items-start gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    audience === 'link'
                      ? 'bg-[color:var(--library-green)]/12 text-[color:var(--library-green)]'
                      : 'bg-[color:var(--surface-soft)] text-[color:var(--ink-soft)]'
                  }`}
                  aria-hidden
                >
                  {audience === 'link' ? <GlobeIcon /> : <LockIcon />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <select
                        value={audience}
                        onChange={(e) => changeAudience(e.target.value as Audience)}
                        disabled={pending}
                        className="appearance-none rounded-md border border-transparent bg-transparent py-1 pr-7 pl-0 text-[14px] font-medium text-[color:var(--ink)] outline-none transition-colors duration-200 hover:text-[color:var(--library-green)] focus:border-[color:var(--paper-rule)] focus:px-2 disabled:opacity-70"
                      >
                        <option value="restricted">Restricted</option>
                        <option value="link">Anyone with the link</option>
                      </select>
                      <svg
                        viewBox="0 0 24 24"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[color:var(--ink-soft)]"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    {audience === 'link' && (
                      <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                        Viewer
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-display-italic text-[13px] text-[color:var(--ink-soft)]">
                    {audience === 'link'
                      ? 'Anyone on the internet with the link can browse this course’s tree and copy lines into their own library.'
                      : 'Only you can access this course.'}
                  </p>
                  {audience === 'link' && (
                    <button
                      type="button"
                      onClick={() => submit('rotate')}
                      disabled={pending}
                      className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] underline-offset-4 transition-colors duration-200 hover:text-[color:var(--library-green)] hover:underline disabled:opacity-60"
                    >
                      {pending ? 'Working…' : 'Reset link'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-[color:var(--paper-rule)] bg-[color:var(--paper-shade)] px-6 py-4">
              <button
                type="button"
                onClick={copy}
                disabled={!fullUrl}
                aria-live="polite"
                className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-[background-color,border-color,color,transform] duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] ${
                  copied
                    ? 'scale-[1.03] border-[color:var(--library-green)] bg-[color:var(--library-green)] text-[color:var(--paper)] shadow-[0_4px_18px_rgba(47,111,94,0.35)]'
                    : 'border-[color:var(--paper-rule)] bg-[color:var(--paper)] text-[color:var(--ink)] enabled:hover:border-[color:var(--library-green)] enabled:hover:text-[color:var(--library-green)]'
                }`}
              >
                <span
                  key={copied ? 'check' : 'link'}
                  className="inline-flex animate-[shareCopyPop_320ms_ease-out] items-center gap-2"
                >
                  {copied ? <CheckIcon /> : <LinkIcon />}
                  {copied ? 'Copied!' : 'Copy link'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-[color:var(--ink)] px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--paper)] transition-colors duration-200 hover:bg-[color:var(--library-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--paper)]"
              >
                Done
              </button>
            </footer>
          </div>
        </div>,
        portalEl,
      )}
    </>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}
