import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="h-1 w-full bg-linear-to-r from-amber-400 via-emerald-400 to-sky-500" />

      <section className="bg-linear-to-b from-muted/40 via-background to-background">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-56 max-w-full" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Skeleton className="h-10 w-44 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border/40 bg-card/70 p-6"
            >
              <div className="flex gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-28 rounded-md" />
                </div>

                <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
