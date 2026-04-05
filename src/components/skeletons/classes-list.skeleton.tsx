import { Skeleton } from "@/components/ui/skeleton";

export function ClassesListSkeleton() {
  return (
    <section>
      <header className="mb-8 rounded-4xl border border-border/70 bg-card/80 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.45)]">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40 rounded-full" />
          <Skeleton className="h-12 w-56 max-w-full" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row">
          <Skeleton className="h-12 flex-1 rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl lg:w-44" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.75rem] border border-border/70 bg-card/70 p-4 shadow-sm"
          >
            <div className="flex gap-4">
              <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-18 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

