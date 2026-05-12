import { AppSurface } from '@/components/ui/Premium';

function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[color:var(--paper-rule)] ${className}`} />;
}

export default function TrainLoading() {
  return (
    <AppSurface>
      <div className="mb-10 border-b border-[color:var(--paper-rule)] pb-8 md:mb-14 md:pb-10">
        <Bone className="mb-5 h-2.5 w-28" />
        <Bone className="h-12 w-3/4 md:h-16 lg:h-20" />
        <Bone className="mt-6 h-3.5 w-2/3" />
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-6 border-y border-[color:var(--paper-rule)] py-8">
        {[1, 2, 3].map((i) => (
          <Bone key={i} className="h-16" />
        ))}
      </div>
    </AppSurface>
  );
}
