import { Skeleton } from "@/components/ui/skeleton";

export function PersonagemCreateFormSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/40 bg-card/70 p-6">
            <Skeleton className="h-5 w-32" />
            <div className="mt-5 space-y-4">
              <Skeleton className="h-11 w-full rounded-md" />
              <Skeleton className="h-11 w-full rounded-md" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          </div>

          <div className="rounded-3xl border border-border/40 bg-card/70 p-6">
            <Skeleton className="h-5 w-28" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border/40 bg-card/70 p-6">
            <Skeleton className="h-5 w-40" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-2xl" />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/40 bg-card/70 p-6">
            <Skeleton className="h-5 w-36" />
            <div className="mt-5 space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-11 w-48 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
