import { Skeleton } from "@/components/ui/skeleton";

export function ClassesListSkeleton() {
  return (
    <section>
      <Skeleton className="mb-5 h-5 w-44 rounded-full" />
      <header className="mb-6 rounded-[1.6rem] border border-border/70 bg-card/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-3 w-44 rounded-full" />
            <Skeleton className="h-10 w-56 max-w-full" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-2xl lg:w-[24rem]" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-20 rounded-full" />
          ))}
          <Skeleton className="ml-auto h-7 w-28 rounded-full" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm"
          >
            <div className="flex gap-3">
              <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-18 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Skeleton className="h-17 rounded-xl" />
              <Skeleton className="h-17 rounded-xl" />
            </div>
            <div className="mt-3 flex justify-end">
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
