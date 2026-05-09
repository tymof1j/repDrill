'use client';

import { useState, useTransition } from 'react';
import { GhostButton, SecondaryButton } from '@/components/ui/Premium';
import { setSharingAction } from '../actions';

export function SharePanel({
  courseId,
  isPublic: initialIsPublic,
  shareToken: initialToken,
}: {
  courseId: string;
  isPublic: boolean;
  shareToken: string | null;
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [token, setToken] = useState(initialToken);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const fullUrl =
    typeof window !== 'undefined' && token
      ? `${window.location.origin}/share/${token}`
      : token
        ? `/share/${token}`
        : '';

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
    <section className="mb-12 border border-[color:var(--paper-edge)] bg-[color:var(--paper-shade)]">
      <div className="flex items-center justify-between gap-4 border-b border-[color:var(--paper-edge)] px-5 py-3 md:px-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Sharing
        </p>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
            isPublic ? 'text-[color:var(--library-green)]' : 'text-[color:var(--ink-faint)]'
          }`}
        >
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>
      <div className="px-5 py-5 md:px-7">
        {!isPublic ? (
          <div className="flex flex-wrap items-baseline gap-4">
            <p className="flex-1 font-display-italic text-[15px] text-[color:var(--ink-soft)]">
              Generate a read-only link. Anyone with it can browse this course&rsquo;s tree
              and copy lines into their own library.
            </p>
            <SecondaryButton onClick={() => submit('enable')} disabled={pending}>
              {pending ? 'Generating…' : 'Make public'}
            </SecondaryButton>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 truncate border border-[color:var(--paper-edge)] bg-[color:var(--paper)] px-3 py-2 font-mono text-[12px] text-[color:var(--ink)]">
                {fullUrl}
              </code>
              <SecondaryButton onClick={copy}>{copied ? 'Copied' : 'Copy'}</SecondaryButton>
            </div>
            <div className="flex flex-wrap gap-3">
              <GhostButton onClick={() => submit('rotate')} disabled={pending}>
                Rotate token
              </GhostButton>
              <GhostButton onClick={() => submit('disable')} disabled={pending}>
                Revoke
              </GhostButton>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
