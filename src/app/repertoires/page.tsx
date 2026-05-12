'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@convex/_generated/api';
import { AppSurface, EmptyState, PageHeader, PremiumButton } from '@/components/ui/Premium';
import { DeleteRepertoireButton } from './DeleteRepertoireButton';

export default function RepertoiresListPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  const items = useQuery(api.repertoires.list);

  if (!isAuthenticated || items === undefined) return null;

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Part II — Repertoires"
        title="Bound volumes."
        body="Combine courses across colors into a single preparation map. When two courses overlap on the same position, choose which line wins."
        action={<PremiumButton href="/repertoires/new">New repertoire</PremiumButton>}
      />

      {items.length === 0 ? (
        <EmptyState>
          No repertoires bound yet. Create one and add courses to combine your prep
          into a single, conflict-resolved map.
        </EmptyState>
      ) : (
        <ol className="divide-y divide-[color:var(--paper-rule)] border-y border-[color:var(--paper-edge)]">
          {items.map((r, idx) => {
            const num = String(idx + 1).padStart(2, '0');
            return (
              <li
                key={r._id}
                className="group relative grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-5 gap-y-2 py-7 transition-colors duration-200 hover:bg-[color:var(--paper-shade)] md:grid-cols-[3.5rem_minmax(0,1fr)_auto] md:gap-x-8 md:py-8"
              >
                <span
                  className="font-display text-2xl italic text-[color:var(--ink-faint)] group-hover:text-[color:var(--margin-red)]"
                  style={{ fontFeatureSettings: '"onum"' }}
                >
                  {num}
                </span>
                <Link
                  href={`/repertoires/${r._id}`}
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
                </Link>
                <DeleteRepertoireButton id={r._id} />
              </li>
            );
          })}
        </ol>
      )}
    </AppSurface>
  );
}
