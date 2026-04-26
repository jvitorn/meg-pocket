import { Skeleton } from "@/components/ui/skeleton";

export function RacaListSkeleton() {
  return (
    <section>
      <Skeleton className="mb-5 h-5 w-44 rounded-full" />
      <header className="mb-8 rounded-4xl border border-border/70 bg-card/80 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-3 w-40 rounded-full" />
            <Skeleton className="h-12 w-64 max-w-full" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-2xl lg:w-[24rem]" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-[1.75rem] border border-border/70 bg-card/70 p-4">
            <div className="flex gap-4">
              <Skeleton className="h-20 w-20 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-6 w-3/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-36 rounded-full" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
