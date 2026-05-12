'use client';

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter } from 'next/navigation';
import { GhostButton } from '@/components/ui/Premium';
import type { Id } from "@convex/_generated/dataModel";

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
