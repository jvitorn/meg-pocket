import SelectedCardSkeleton from "@/components/skeletons/selected-card.skeleton";
import { MultiCardItemSkeleton } from "@/components/skeletons/multi-card-item.skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function PersonagemCampanhaPageSkeleton() {
  return (
    <div className="min-h-screen space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Skeleton className="mb-5 h-5 w-56 rounded-full" />
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Skeleton className="h-10 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>

      <SelectedCardSkeleton />

      <div className="flex justify-center">
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      <MultiCardItemSkeleton.Carousel />
    </div>
  );
}
