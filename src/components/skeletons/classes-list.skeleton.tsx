import { Skeleton } from "@/components/ui/skeleton";

export function ClassesListSkeleton() {
  return (
    <section>
      <header className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <Skeleton className="h-10 w-full flex-1 rounded-md" />
          <Skeleton className="h-10 w-full rounded-md lg:w-52" />
        </div>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex gap-4 rounded-xl border border-border/40 bg-card/60 p-4"
          >
            <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />

            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />

              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-[4.5rem] rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
