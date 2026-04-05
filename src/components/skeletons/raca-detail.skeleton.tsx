import { Skeleton } from "@/components/ui/skeleton";

export function RacaDetailSkeleton() {
  return (
    <main className="w-full bg-background text-foreground">
      <section className="relative flex min-h-[72vh] w-full items-end justify-center overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />

        <div className="relative z-10 flex w-full max-w-7xl flex-col justify-end px-6 pb-14 pt-32">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="mx-auto flex w-full max-w-xl items-end justify-center">
              <Skeleton className="h-128ull rounded-[2.5rem]" />
            </div>

            <div className="max-w-3xl lg:text-right">
              <Skeleton className="h-8 w-48 rounded-full" />
              <div className="mt-4 flex flex-wrap items-center gap-4 lg:justify-end">
                <Skeleton className="h-16 w-28 rounded-2xl" />
                <Skeleton className="h-16 w-16 rounded-2xl" />
              </div>
              <Skeleton className="mt-6 h-16 w-5/6 lg:ml-auto" />
              <Skeleton className="mt-4 h-6 w-full max-w-2xl lg:ml-auto" />
              <Skeleton className="mt-3 h-6 w-4/5 lg:ml-auto" />
              <div className="mt-8 flex flex-wrap gap-3 lg:justify-end">
                <Skeleton className="h-24 w-32 rounded-2xl" />
                <Skeleton className="h-24 w-32 rounded-2xl" />
                <Skeleton className="h-24 w-28 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative -mt-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6 rounded-4xl border border-border/70 bg-card/85 p-6">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-9/12" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          </div>

          <div className="space-y-6 rounded-4xl border border-border/70 bg-card/85 p-6">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-8 w-56" />
            <div className="grid gap-4 xl:grid-cols-2">
              <Skeleton className="h-56 rounded-3xl" />
              <Skeleton className="h-56 rounded-3xl" />
            </div>
            <Skeleton className="h-24 rounded-3xl" />
          </div>
        </div>
      </section>
    </main>
  );
}

