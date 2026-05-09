import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listRepertoires } from '@/lib/repertoire/queries';
import { AppSurface, EmptyState, PageHeader, PremiumButton, SecondaryButton } from '@/components/ui/Premium';
import { deleteRepertoireAction } from './actions';

export default async function RepertoiresListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const items = await listRepertoires(session.user.id);

  return (
    <AppSurface>
      <PageHeader
        eyebrow="Merged preparation"
        title="Repertoires"
        body="Combine courses across colors and decide which line wins when preparation overlaps."
        action={<PremiumButton href="/repertoires/new">New repertoire</PremiumButton>}
      />

      {items.length === 0 ? (
        <EmptyState>No repertoires yet. Create one and add courses to it.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-[#f8f1df]/10 bg-[#f8f1df]/[0.065] p-1"
            >
              <div className="flex h-full flex-col justify-between rounded-[0.875rem] bg-[#11100d] p-5">
                <Link
                  href={`/repertoires/${r.id}`}
                  className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b46a]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#11100d]"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a99d82]">
                    Repertoire
                  </span>
                  <h2 className="mt-3 text-2xl font-semibold text-[#fff8e6] transition-colors duration-200 group-hover:text-[#d7b46a]">
                    {r.name}
                  </h2>
                  {r.description && (
                    <p className="mt-4 text-sm leading-6 text-[#a99f89]">{r.description}</p>
                  )}
                </Link>
                <form action={deleteRepertoireAction} className="mt-6">
                  <input type="hidden" name="id" value={r.id} />
                  <SecondaryButton type="submit" className="px-4 py-2 text-xs">
                    Delete
                  </SecondaryButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppSurface>
  );
}
