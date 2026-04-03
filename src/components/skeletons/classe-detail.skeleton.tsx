import { Skeleton } from "@/components/ui/skeleton";

export function ClasseDetailSkeleton() {
  return (
    <main className="w-full bg-background text-foreground">
      <section className="relative flex h-[60vh] w-full items-end justify-center md:h-[72vh]">
        <Skeleton className="absolute inset-0 rounded-none" />

        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center px-6 pb-24">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="mt-6 h-14 w-72 max-w-full" />
          <Skeleton className="mt-3 h-6 w-56 max-w-full" />
        </div>
      </section>

      <section className="relative -mt-20 mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-12">
          <div className="order-2 space-y-5 md:col-span-7 md:order-1">
            <Skeleton className="h-11 w-48" />

            <div className="space-y-6 rounded-lg border border-border/40 bg-card/60 p-7">
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-5/6" />
              </div>

              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-10/12" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
          </div>

          <div className="order-1 flex flex-col items-center md:col-span-5 md:order-2">
            <Skeleton className="h-[26rem] w-full max-w-sm rounded-3xl" />
            <Skeleton className="mt-3 h-4 w-48" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-12 gap-2">
          <div className="col-span-12 space-y-6">
            <div className="rounded-lg bg-card/60 p-6">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-12 w-full rounded-md" />
            </div>

            <div className="rounded-lg bg-card/60 p-6">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-36" />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-lg border border-border/40 bg-background/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-4 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-24" />
      </section>
    </main>
  );
}
