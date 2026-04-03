import { Skeleton } from "@/components/ui/skeleton";

export function PersonagemBaileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-background p-5 shadow-lg">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Skeleton className="h-24 w-24 rounded-full" />

          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-[4.5rem] rounded-full" />
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 md:w-72">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
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
            <Skeleton className="h-4 w-16" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-10 w-40 rounded-md" />
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-lg border border-border/40 bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 p-3"
                >
                  <Skeleton className="h-11 w-11 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-5">
            <Skeleton className="h-4 w-20" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
