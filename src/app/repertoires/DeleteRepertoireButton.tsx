'use client';

import { useMutation } from '@/lib/supabase/client';
import { api } from '@/lib/supabase/api';
import { useRouter } from 'next/navigation';
import { GhostButton } from '@/components/ui/Premium';
import type { Id } from '@/lib/supabase/types';

export function DeleteRepertoireButton({ id }: { id: Id<"repertoires"> }) {
  const router = useRouter();
  const remove = useMutation(api.repertoires.remove);

  return (
    <GhostButton
      onClick={async () => {
        await remove({ id });
        router.push('/repertoires');
        router.refresh();
      }}
    >
      Delete
    </GhostButton>
  );
}
