'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Link2, Lock, Mail, Share2, Users, X } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { sendShareInvitationAction } from '@/app/share/actions';

export type ShareResourceType = 'course' | 'repertoire' | 'analysis';
type LinkAccess = 'none' | 'view' | 'copy' | 'collaborate';
type InviteAccess = 'view' | 'copy' | 'collaborate';

const accessCopy: Record<LinkAccess, { label: string; helper: string }> = {
  none: {
    label: 'Restricted',
    helper: 'Only invited users can open this item.',
  },
  view: {
    label: 'Can view',
    helper: 'Anyone with the link can inspect it.',
  },
  copy: {
    label: 'Can view + copy',
    helper: 'Anyone with the link can inspect and copy it.',
  },
  collaborate: {
    label: 'Can collaborate',
    helper: 'Anyone with the link can edit annotations where supported.',
  },
};

const inviteLevels: InviteAccess[] = ['view', 'copy', 'collaborate'];
const linkLevels: LinkAccess[] = ['none', 'view', 'copy', 'collaborate'];
const defaultButtonClassName =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--surface-soft)] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.13em] text-[color:var(--ink)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--surface)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--paper)]';

function splitEmails(value: string) {
  return value
    .split(/[,\n;]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function ShareDialog({
  resourceType,
  resourceId,
  title,
  buttonClassName,
}: {
  resourceType: ShareResourceType;
  resourceId: string;
  title: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteAccess, setInviteAccess] = useState<InviteAccess>('view');
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [pendingInvite, startInvite] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const settings = useQuery(api.sharing.getSettings, { resourceType, resourceId });
  const setLinkAccess = useMutation(api.sharing.setLinkAccess);
  const upsertInvitation = useMutation(api.sharing.upsertInvitation);
  const removeInvitation = useMutation(api.sharing.removeInvitation);
  const [localLink, setLocalLink] = useState<{ access: LinkAccess; token: string | null } | null>(null);
  const linkAccess = localLink?.access ?? settings?.linkAccess ?? 'none';
  const token = localLink?.token ?? settings?.token ?? null;
  const emailCount = splitEmails(email).length;

  const shareUrl = useMemo(() => {
    if (!token) return '';
    if (typeof window === 'undefined') return `/share/${token}`;
    return `${window.location.origin}/share/${token}`;
  }, [token]);
  const resourcePath =
    resourceType === 'course'
      ? `/courses/${resourceId}`
      : resourceType === 'repertoire'
        ? `/repertoires/${resourceId}`
        : `/analyze?shared=${encodeURIComponent(resourceId)}`;
  const directUrl =
    typeof window === 'undefined' ? resourcePath : `${window.location.origin}${resourcePath}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!dialogRef.current?.contains(e.target as Node)) setOpen(false);
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
    if (!open) triggerRef.current?.focus();
  }, [open]);

  const copy = async () => {
    let url = shareUrl;
    if (!url && linkAccess !== 'none') {
      const result = await setLinkAccess({ resourceType, resourceId, access: linkAccess });
      setLocalLink({ access: result.access, token: result.token });
      if (result.token && typeof window !== 'undefined') {
        url = `${window.location.origin}/share/${result.token}`;
      }
    }
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  const invite = () => {
    setStatus(null);
    const fd = new FormData();
    fd.set('resourceType', resourceType);
    fd.set('resourceId', resourceId);
    fd.set('email', email);
    fd.set('access', inviteAccess);
    fd.set('notify', String(notify));
    fd.set('message', message);
    fd.set('shareUrl', shareUrl || directUrl);
    startInvite(async () => {
      try {
        const result = await sendShareInvitationAction(fd);
        setStatus(notify ? `${result.count} invitation${result.count === 1 ? '' : 's'} sent.` : `${result.count} access grant${result.count === 1 ? '' : 's'} added.`);
        setEmail('');
        setMessage('');
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'Could not invite this user.');
      }
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName ?? defaultButtonClassName}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Share2 size={14} />
        Share
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--ink)]/45 px-4 py-6 backdrop-blur-[2px]">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
            className="max-h-[92vh] w-full max-w-[660px] overflow-y-auto rounded-xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)] shadow-[0_28px_80px_rgba(23,26,23,0.25)]"
          >
            <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  Share {resourceType === 'analysis' ? 'analysis game' : resourceType}
                </p>
                <h2 id="share-dialog-title" className="mt-1 font-display text-[24px] font-semibold leading-tight text-[color:var(--ink)]">
                  {settings?.title ?? title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-2 grid h-9 w-9 place-items-center rounded-full text-[color:var(--ink-soft)] transition-colors hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--library-green)]"
              >
                <X size={18} />
              </button>
            </header>

            <div className="space-y-6 px-6 pb-6">
              <section>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  People with access
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--ink)] text-[color:var(--paper)]">
                    <Users size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[color:var(--ink)]">
                      {settings?.ownerName ?? 'You'} <span className="text-[color:var(--ink-faint)]">(you)</span>
                    </p>
                    {settings?.ownerEmail && (
                      <p className="truncate text-[13px] text-[color:var(--ink-soft)]">{settings.ownerEmail}</p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">Owner</span>
                </div>
                {(settings?.invitations ?? []).length > 0 && (
                  <ul className="mt-3 divide-y divide-[color:var(--paper-rule)] border-y border-[color:var(--paper-rule)]">
                    {settings!.invitations.map((invite) => (
                      <li key={invite.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-center">
                        <span className="min-w-0 truncate text-[14px] text-[color:var(--ink)]">{invite.email}</span>
                        <NiceSelect
                          compact
                          value={invite.access}
                          onChange={(value) => {
                            if (value === 'remove') {
                              void removeInvitation({ resourceType, resourceId, email: invite.email });
                              return;
                            }
                            void upsertInvitation({
                              resourceType,
                              resourceId,
                              email: invite.email,
                              access: value as InviteAccess,
                              notify: false,
                            });
                          }}
                          options={[
                            ...inviteLevels.map((level) => ({ value: level, label: accessCopy[level].label })),
                            { value: 'remove', label: 'Remove access' },
                          ]}
                        />
                        <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)] sm:block">
                          Direct
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="border-y border-[color:var(--paper-rule)] py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  General access
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${linkAccess === 'none' ? 'bg-[color:var(--surface-soft)] text-[color:var(--ink-soft)]' : 'bg-[color:var(--library-green)]/12 text-[color:var(--library-green)]'}`}>
                    {linkAccess === 'none' ? <Lock size={18} /> : <Link2 size={18} />}
                  </span>
                  <div>
                    <NiceSelect
                      value={linkAccess}
                      onChange={(value) => {
                        void setLinkAccess({ resourceType, resourceId, access: value as LinkAccess }).then((result) => {
                          setLocalLink({ access: result.access, token: result.token });
                        });
                      }}
                      options={linkLevels.map((level) => ({ value: level, label: accessCopy[level].label }))}
                    />
                    <p className="mt-2 font-display-italic text-[14px] text-[color:var(--ink-soft)]">
                      {accessCopy[linkAccess].helper}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-ghost)]">
                      {linkAccess === 'none'
                        ? 'Copy link stays disabled until link access is enabled.'
                        : 'Changing this selector prepares the link automatically.'}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  Invite by email
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                  <label className="flex min-h-12 items-center gap-2 rounded-lg border border-[color:var(--paper-edge)] px-3 focus-within:border-[color:var(--ink)]">
                    <Mail size={16} className="shrink-0 text-[color:var(--ink-faint)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com, teammate@example.com"
                      className="min-w-0 flex-1 bg-transparent text-[15px] text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-ghost)]"
                    />
                  </label>
                  <NiceSelect
                    value={inviteAccess}
                    onChange={(value) => setInviteAccess(value as InviteAccess)}
                    options={inviteLevels.map((level) => ({ value: level, label: accessCopy[level].label }))}
                  />
                </div>
                <label className="mt-4 flex items-center gap-3 text-[14px] text-[color:var(--ink)]">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="h-4 w-4 accent-[color:var(--library-green)]"
                  />
                  Send invitation email with Resend
                </label>
                {notify && (
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Optional message"
                    rows={3}
                    className="mt-3 w-full rounded-lg border border-[color:var(--paper-edge)] bg-transparent px-3 py-2 text-[14px] text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--ink)]"
                  />
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={invite}
                    disabled={pendingInvite || !email.trim()}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--paper)] transition-colors hover:border-[color:var(--library-green)] hover:bg-[color:var(--library-green)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingInvite ? 'Sending...' : emailCount > 1 ? `Invite ${emailCount}` : 'Invite'}
                  </button>
                  {status && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">{status}</span>
                  )}
                </div>
              </section>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-[color:var(--paper-rule)] bg-[color:var(--paper-shade)] px-6 py-4">
              <button
                type="button"
                onClick={copy}
                disabled={linkAccess === 'none'}
                className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  copied
                    ? 'border-[color:var(--library-green)] bg-[color:var(--library-green)] text-[color:var(--paper)]'
                    : 'border-[color:var(--paper-rule)] bg-[color:var(--paper)] text-[color:var(--ink)] hover:border-[color:var(--library-green)] hover:text-[color:var(--library-green)]'
                }`}
              >
                {copied ? <Check size={14} /> : <Link2 size={14} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--paper)] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink)] transition-colors hover:border-[color:var(--library-green)] hover:text-[color:var(--library-green)]"
              >
                Done
              </button>
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function NiceSelect({
  value,
  onChange,
  options,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  compact?: boolean;
}) {
  return (
    <label className="relative block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${compact ? 'h-10 text-[13px]' : 'h-12 text-[14px]'} w-full appearance-none rounded-lg border border-[color:var(--paper-edge)] bg-[color:var(--paper)] px-4 pr-10 font-medium text-[color:var(--ink)] outline-none transition-colors hover:border-[color:var(--ink-soft)] focus:border-[color:var(--ink)]`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--ink-faint)]"
      />
    </label>
  );
}
