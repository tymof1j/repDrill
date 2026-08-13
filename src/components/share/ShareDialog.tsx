'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Check, Link2, Lock, Mail, Share2, Users, X } from 'lucide-react';
import { useMutation, useQuery } from '@/lib/supabase/client';
import { api } from '@/lib/supabase/api';
import { sendShareInvitationAction } from '@/app/share/actions';
import { CustomSelect } from '@/components/ui/CustomSelect';

export type ShareResourceType = 'course' | 'repertoire' | 'analysis';
type ShareScopeType = 'resource' | 'course' | 'chapter';
type LinkAccess = 'none' | 'view' | 'copy' | 'collaborate';
type InviteAccess = 'view' | 'copy' | 'collaborate';
type ShareInvitation = { id: string; email: string; access: InviteAccess; notify: boolean };

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
const linkRoleLevels: InviteAccess[] = ['view', 'copy', 'collaborate'];
const shortAccessLabels: Record<LinkAccess, string> = {
  none: 'Limited access',
  view: 'View',
  copy: 'Copy',
  collaborate: 'Collaborate',
};
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
  scopes,
}: {
  resourceType: ShareResourceType;
  resourceId: string;
  title: string;
  buttonClassName?: string;
  scopes?: {
    type: ShareScopeType;
    id?: string;
    label: string;
    description?: string;
  }[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteAccess, setInviteAccess] = useState<InviteAccess>('view');
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [scopeKey, setScopeKey] = useState('resource:');
  const [localInvitations, setLocalInvitations] = useState<{
    scopeKey: string;
    rows: ShareInvitation[];
  } | null>(null);
  const [pendingInvite, startInvite] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const scopeOptions = useMemo(
    () => (scopes && scopes.length > 0 ? scopes : [{ type: 'resource' as const, label: 'Entire item' }]),
    [scopes],
  );
  const selectedScope =
    scopeOptions.find((scope) => `${scope.type}:${scope.id ?? ''}` === scopeKey) ?? scopeOptions[0];
  const selectedScopeKey = `${selectedScope.type}:${selectedScope.id ?? ''}`;

  const settings = useQuery(api.sharing.getSettings, {
    resourceType,
    resourceId,
    scopeType: selectedScope.type,
    scopeId: selectedScope.id,
  });
  const setLinkAccess = useMutation(api.sharing.setLinkAccess);
  const upsertInvitation = useMutation(api.sharing.upsertInvitation);
  const removeInvitation = useMutation(api.sharing.removeInvitation);
  const transferOwnership = useMutation(api.sharing.transferOwnership);
  const [localLink, setLocalLink] = useState<{ access: LinkAccess; token: string | null } | null>(null);
  const linkAccess = localLink?.access ?? settings?.linkAccess ?? 'none';
  const token = localLink?.token ?? settings?.token ?? null;
  const emailCount = splitEmails(email).length;
  const invitations = localInvitations?.scopeKey === selectedScopeKey
    ? localInvitations.rows
    : settings?.invitations ?? [];

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
      const target = e.target as HTMLElement;
      if (target.closest('[data-custom-select-menu="true"]')) return;
      if (!dialogRef.current?.contains(target)) setOpen(false);
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
      const result = await setLinkAccess({
        resourceType,
        resourceId,
        scopeType: selectedScope.type,
        scopeId: selectedScope.id,
        scopeLabel: selectedScope.label,
        access: linkAccess,
      });
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
        const invitedEmails = splitEmails(email);
        fd.set('scopeType', selectedScope.type);
        fd.set('scopeId', selectedScope.id ?? '');
        fd.set('scopeLabel', selectedScope.label);
        await sendShareInvitationAction(fd);
        setLocalInvitations((current) => {
          const next = [
            ...(current?.scopeKey === selectedScopeKey ? current.rows : settings?.invitations ?? []),
          ] as ShareInvitation[];
          for (const invitedEmail of invitedEmails) {
            const match = next.find((inviteRow) => inviteRow.email === invitedEmail);
            if (match) {
              match.access = inviteAccess;
              match.notify = notify;
            } else {
              next.push({
                id: `local:${selectedScope.type}:${selectedScope.id ?? 'resource'}:${invitedEmail}`,
                email: invitedEmail,
                access: inviteAccess,
                notify,
              });
            }
          }
          return {
            scopeKey: selectedScopeKey,
            rows: next.sort((a, b) => a.email.localeCompare(b.email)),
          };
        });
        const granted = invitedEmails.length;
        setStatus(notify ? `${granted} invitation${granted === 1 ? '' : 's'} sent.` : `${granted} access grant${granted === 1 ? '' : 's'} added.`);
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

            <div className="space-y-5 px-6 pb-6">
              {scopeOptions.length > 1 && (
                <section className="rounded-lg border border-[color:var(--paper-rule)] bg-[color:var(--paper-shade)] p-3">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-semibold text-[color:var(--ink)]">Share scope</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                      {selectedScope.type === 'resource' ? 'full' : selectedScope.type}
                    </p>
                  </div>
                  <CustomSelect
                    value={`${selectedScope.type}:${selectedScope.id ?? ''}`}
                    menuMaxHeight={360}
                    onChange={(value) => {
                      setScopeKey(value);
                      setLocalLink(null);
                    }}
                    options={scopeOptions.map((scope) => ({
                      value: `${scope.type}:${scope.id ?? ''}`,
                      label: scope.label,
                      description: scope.description,
                    }))}
                  />
                </section>
              )}

              <section>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                  <label className="flex min-h-12 items-center gap-2 rounded-lg border border-[color:var(--paper-edge)] bg-[color:var(--paper)] px-3 transition-colors focus-within:border-[color:var(--library-green)] focus-within:ring-2 focus-within:ring-[color:var(--library-green)]/15">
                    <Mail size={16} className="shrink-0 text-[color:var(--ink-faint)]" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Add people by email, separated with commas"
                      className="min-w-0 flex-1 bg-transparent text-[15px] text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-ghost)]"
                    />
                  </label>
                  <CustomSelect
                    value={inviteAccess}
                    onChange={(value) => setInviteAccess(value as InviteAccess)}
                    menuLabel="Role you give"
                    options={inviteLevels.map((level) => ({
                      value: level,
                      label: shortAccessLabels[level],
                    }))}
                  />
                </div>
                {emailCount > 0 && (
                  <>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-3 text-[14px] text-[color:var(--ink)]">
                        <input
                          type="checkbox"
                          checked={notify}
                          onChange={(e) => setNotify(e.target.checked)}
                          className="h-4 w-4 accent-[color:var(--library-green)]"
                        />
                        Send invitation email
                      </label>
                  <button
                    type="button"
                    onClick={invite}
                    disabled={pendingInvite || !email.trim()}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--ink)] bg-[color:var(--ink)] px-5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--paper)] transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[color:var(--library-green)] hover:bg-[color:var(--library-green)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                        {pendingInvite ? 'Sending...' : emailCount > 1 ? `Invite ${emailCount}` : 'Invite'}
                      </button>
                    </div>
                    {notify && (
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Optional message"
                        rows={2}
                        className="mt-3 w-full rounded-lg border border-[color:var(--paper-edge)] bg-transparent px-3 py-2 text-[14px] text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--ink)]"
                      />
                    )}
                  </>
                )}
                {status && (
                  <p className="mt-3 text-[13px] text-[color:var(--ink-soft)]">{status}</p>
                )}
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold text-[color:var(--ink)]">People with access</p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                    {invitations.length + 1}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg px-1 py-2">
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
                  <span className="text-[13px] text-[color:var(--ink-faint)]">Owner</span>
                </div>
                {invitations.length > 0 && (
                  <ul className="mt-1 divide-y divide-[color:var(--paper-rule)]">
                    {invitations.map((invite) => (
                      <li key={invite.id} className="grid gap-3 rounded-lg px-1 py-2 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center">
                        <div className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-[color:var(--ink)]">{invite.email}</span>
                          <span className="text-[12px] text-[color:var(--ink-soft)]">Direct invite</span>
                        </div>
                        <CustomSelect
                          compact
                          align="right"
                          value={invite.access}
                          onChange={(value) => {
                            if (value === 'remove') {
                              setLocalInvitations((current) =>
                                ({
                                  scopeKey: selectedScopeKey,
                                  rows: (current?.scopeKey === selectedScopeKey ? current.rows : settings?.invitations ?? [])
                                    .filter((row) => row.email !== invite.email),
                                }),
                              );
                              void removeInvitation({
                                resourceType,
                                resourceId,
                                scopeType: selectedScope.type,
                                scopeId: selectedScope.id,
                                email: invite.email,
                              });
                              return;
                            }
                            if (value === 'transfer') {
                              setStatus('Use Transfer ownership below to confirm.');
                              return;
                            }
                            setLocalInvitations((current) =>
                              ({
                                scopeKey: selectedScopeKey,
                                rows: (current?.scopeKey === selectedScopeKey ? current.rows : settings?.invitations ?? [])
                                  .map((row) =>
                                    row.email === invite.email ? { ...row, access: value as InviteAccess } : row,
                                  ),
                              }),
                            );
                            void upsertInvitation({
                              resourceType,
                              resourceId,
                              scopeType: selectedScope.type,
                              scopeId: selectedScope.id,
                              scopeLabel: selectedScope.label,
                              email: invite.email,
                              access: value as InviteAccess,
                              notify: false,
                            });
                          }}
                          options={[
                            ...inviteLevels.map((level) => ({ value: level, label: shortAccessLabels[level] })),
                            { value: 'transfer', label: 'Transfer ownership', separatorBefore: true },
                            { value: 'remove', label: 'Remove access', destructive: true },
                          ]}
                          menuLabel="Role"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="border-t border-[color:var(--paper-rule)] pt-5">
                <p className="text-[15px] font-semibold text-[color:var(--ink)]">General access</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${linkAccess === 'none' ? 'bg-[color:var(--surface-soft)] text-[color:var(--ink-soft)]' : 'bg-[color:var(--library-green)]/12 text-[color:var(--library-green)]'}`}>
                    {linkAccess === 'none' ? <Lock size={18} /> : <Link2 size={18} />}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px] sm:items-center">
                    <CustomSelect
                      compact
                      value={linkAccess === 'none' ? 'none' : 'link'}
                      onChange={(value) => {
                        const nextAccess = value === 'none' ? 'none' : linkAccess === 'none' ? 'view' : linkAccess;
                        void setLinkAccess({
                          resourceType,
                          resourceId,
                          scopeType: selectedScope.type,
                          scopeId: selectedScope.id,
                          scopeLabel: selectedScope.label,
                          access: nextAccess as LinkAccess,
                        }).then((result) => {
                          setLocalLink({ access: result.access, token: result.token });
                        });
                      }}
                      options={[
                        { value: 'none', label: 'Limited access', description: 'Only invited people can open.' },
                        { value: 'link', label: 'Anyone with link', description: 'People with this link can open.' },
                      ]}
                    />
                    {linkAccess !== 'none' && (
                      <CustomSelect
                        align="right"
                        compact
                        value={linkAccess}
                      onChange={(value) => {
                        void setLinkAccess({
                          resourceType,
                          resourceId,
                          scopeType: selectedScope.type,
                          scopeId: selectedScope.id,
                          scopeLabel: selectedScope.label,
                          access: value as LinkAccess,
                        }).then((result) => {
                          setLocalLink({ access: result.access, token: result.token });
                        });
                      }}
                        options={linkRoleLevels.map((level) => ({
                        value: level,
                          label: shortAccessLabels[level],
                      }))}
                        menuLabel="Role"
                      />
                    )}
                    <p className="text-[13px] leading-5 text-[color:var(--ink-soft)] sm:col-span-2">
                      {accessCopy[linkAccess].helper}
                    </p>
                  </div>
                </div>
              </section>

              <details className="border-t border-[color:var(--paper-rule)] pt-5">
                <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)] transition-colors hover:text-[color:var(--ink)]">
                  Advanced · transfer ownership
                </summary>
                <p className="mt-3 text-[13px] leading-6 text-[color:var(--ink-soft)]">
                  Transfers the full item to a signed-in user. Sharing links stay, direct invites are cleared.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <input
                    type="email"
                    value={emailCount === 1 ? email : ''}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="new.owner@example.com"
                    className="min-h-11 min-w-[240px] flex-1 rounded-lg border border-[color:var(--paper-edge)] bg-transparent px-3 text-[14px] text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--ink)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const target = splitEmails(email)[0];
                      if (!target) {
                        setStatus('Enter the new owner email first.');
                        return;
                      }
                      void transferOwnership({ resourceType, resourceId, email: target })
                        .then((result) => {
                          setStatus(`Ownership transferred to ${result.ownerEmail}.`);
                          setEmail('');
                        })
                        .catch((e) => {
                          setStatus(e instanceof Error ? e.message : 'Could not transfer ownership.');
                        });
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-[color:var(--paper-rule)] bg-[color:var(--paper)] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink)] transition-colors hover:border-[color:var(--margin-red)] hover:text-[color:var(--margin-red)]"
                  >
                    Transfer
                  </button>
                </div>
              </details>
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
