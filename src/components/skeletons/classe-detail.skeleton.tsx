import { Skeleton } from "@/components/ui/skeleton";

export function ClasseDetailSkeleton() {
  return (
    <main className="w-full bg-background text-foreground">
      <section className="relative flex min-h-[72vh] w-full items-end justify-center overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />

        <div className="relative z-10 mx-auto flex min-h-[72vh] w-full max-w-7xl flex-col justify-end px-6 pb-14 pt-32">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="max-w-3xl space-y-4">
              <Skeleton className="h-8 w-52 rounded-full" />
              <div className="flex flex-wrap items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <Skeleton className="h-16 w-24 rounded-2xl" />
              </div>
              <Skeleton className="h-16 w-5/6" />
              <Skeleton className="h-6 w-full max-w-2xl" />
              <Skeleton className="h-6 w-4/5" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-24 w-32 rounded-2xl" />
                <Skeleton className="h-24 w-32 rounded-2xl" />
                <Skeleton className="h-24 w-44 rounded-2xl" />
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-xl items-end justify-center">
              <Skeleton className="h-136 w-full rounded-[2.5rem]" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative -mt-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-6 rounded-4xl border border-border/70 bg-card/85 p-6">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          </div>

          <div className="space-y-6 rounded-4xl border border-border/70 bg-card/85 p-6">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-8 w-56" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-3xl border border-border/70 bg-background/80 p-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

