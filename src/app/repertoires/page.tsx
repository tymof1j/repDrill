'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useQuery } from '@/lib/supabase/client';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase/api';
import { AppSurface, EmptyState, GhostButton, PageHeader, PremiumButton } from '@/components/ui/Premium';
import { DeleteRepertoireButton } from './DeleteRepertoireButton';
import { renameRepertoireAction } from './actions';

export default function RepertoiresListPage() {
  const { loading: isLoading, user } = useAuth();
  const isAuthenticated = Boolean(user);
  const router = useRouter();
  const [tab, setTab] = useState<'mine' | 'shared'>('mine');
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [, startTransition] = useTransition();

  const saveRename = (id: string) => {
    if (!renameDraft.trim()) return;
    const fd = new FormData();
    fd.set('id', id);
    fd.set('name', renameDraft.trim());
    startTransition(() => void renameRepertoireAction(fd));
    setRenameTargetId(null);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  const items = useQuery(api.repertoires.list);
  const sharedItems = useQuery(api.sharing.listSharedRepertoires);

  if (!isAuthenticated || items === undefined || sharedItems === undefined) return null;
  const visibleItems =
    tab === 'mine'
      ? items.map((r) => ({ id: r._id, name: r.name, description: r.description ?? null, sharedMeta: null as string | null }))
      : sharedItems.map((r) => ({
          id: r.resource._id,
          name: r.resource.name,
          description: r.resource.description ?? null,
          sharedMeta: `Shared by ${r.owner?.name ?? r.owner?.email ?? 'another RepDrill user'} · ${r.invitation.access}`,
        }));

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Part II — Repertoires"
        title="Bound volumes."
        body="Combine courses across colors into a single preparation map. When two courses overlap on the same position, choose which line wins."
        action={<PremiumButton href="/repertoires/new">New repertoire</PremiumButton>}
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-[color:var(--paper-edge)] pb-3">
        <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
          My repertoires
        </TabButton>
        <TabButton active={tab === 'shared'} onClick={() => setTab('shared')}>
          Shared with you
        </TabButton>
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState>
          {tab === 'mine'
            ? 'No repertoires bound yet. Create one and add courses to combine your prep into a single, conflict-resolved map.'
            : 'No shared repertoires yet.'}
        </EmptyState>
      ) : (
        <ol className="divide-y divide-[color:var(--paper-rule)] border-y border-[color:var(--paper-edge)]">
          {visibleItems.map((r, idx) => {
            const num = String(idx + 1).padStart(2, '0');
            const isRenaming = renameTargetId === r.id;
            return (
              <li
                key={r.id}
                className="group relative grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-5 gap-y-2 py-7 transition-colors duration-200 hover:bg-[color:var(--paper-shade)] md:grid-cols-[3.5rem_minmax(0,1fr)_auto] md:gap-x-8 md:py-8"
              >
                <span
                  className="font-display text-2xl italic text-[color:var(--ink-faint)] group-hover:text-[color:var(--margin-red)]"
                  style={{ fontFeatureSettings: '"onum"' }}
                >
                  {num}
                </span>

                {isRenaming ? (
                  <div className="flex flex-wrap items-baseline gap-3">
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(r.id);
                        if (e.key === 'Escape') setRenameTargetId(null);
                      }}
                      className="font-display text-2xl font-medium bg-transparent border-b border-[color:var(--ink)] text-[color:var(--ink)] outline-none md:text-[1.65rem]"
                      autoFocus
                    />
                    <GhostButton onClick={() => saveRename(r.id)}>Save</GhostButton>
                    <GhostButton onClick={() => setRenameTargetId(null)}>Cancel</GhostButton>
                  </div>
                ) : (
                  <Link
                    href={`/repertoires/${r.id}`}
                    className="block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ink)]"
                  >
                    <h2 className="font-display text-2xl font-medium leading-tight text-[color:var(--ink)] underline decoration-transparent decoration-1 underline-offset-[6px] transition-colors duration-200 group-hover:decoration-[color:var(--margin-red)] md:text-[1.65rem]">
                      {r.name}
                    </h2>
                    {r.description && (
                      <p className="mt-2 max-w-2xl font-display-italic text-[15px] leading-relaxed text-[color:var(--ink-soft)]">
                        {r.description}
                      </p>
                    )}
                    {r.sharedMeta && (
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                        {r.sharedMeta}
                      </p>
                    )}
                  </Link>
                )}

                <div className="flex items-center gap-3">
                  {tab === 'mine' && !isRenaming && (
                    <button
                      type="button"
                      title="Rename"
                      onClick={() => { setRenameDraft(r.name); setRenameTargetId(r.id); }}
                      className="text-[color:var(--ink-faint)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[color:var(--ink)]"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {tab === 'mine' ? <DeleteRepertoireButton id={r.id} /> : <span />}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </AppSurface>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
        active
          ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]'
          : 'border-[color:var(--paper-edge)] text-[color:var(--ink-soft)] hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]'
      }`}
    >
      {children}
    </button>
  );
}
