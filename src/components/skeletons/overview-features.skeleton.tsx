import { Skeleton } from "@/components/ui/skeleton";
export function SkeletonOverviewFeatures() {
  return (
    <section className="bg-background text-foreground py-16 px-6">
      <div className="max-w-6xl mx-auto text-center mb-10">
        <Skeleton className="w-1/2 h-8 mx-auto mb-4" />
        <Skeleton className="w-2/3 h-5 mx-auto" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonOverviewFeatures.Card key={i} />
        ))}
      </div>
    </section>
  );
}
// Subcomponente interno: Card
SkeletonOverviewFeatures.Card = function SkeletonOverviewFeatureCard() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center text-center space-y-2">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-2/3 h-5" />
      <Skeleton className="w-full h-3" />
      <Skeleton className="w-[80%] h-3" />
    </div>
  );
};
