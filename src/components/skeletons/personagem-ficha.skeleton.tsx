import { Skeleton } from "@/components/ui/skeleton";

export function PersonagemFichaSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background p-4 shadow-lg md:p-6">
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-6">
          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <div className="flex flex-col items-center gap-4 text-center">
              <Skeleton className="h-28 w-28 rounded-full" />
              <div className="w-full space-y-2">
                <Skeleton className="mx-auto h-7 w-3/4" />
                <Skeleton className="mx-auto h-4 w-1/2" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-12 w-full rounded-md" />
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <Skeleton className="h-4 w-14" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <Skeleton className="h-4 w-20" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-lg border border-border/40 bg-background/60 p-4"
                >
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
