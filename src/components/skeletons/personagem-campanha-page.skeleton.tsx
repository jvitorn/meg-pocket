import SelectedCardSkeleton from "@/components/skeletons/selected-card.skeleton";
import { MultiCardItemSkeleton } from "@/components/skeletons/multi-card-item.skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function PersonagemCampanhaPageSkeleton() {
  return (
    <div className="min-h-screen space-y-10 px-6 py-10">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-80 max-w-full" />
      </div>

      <SelectedCardSkeleton />

      <div className="flex justify-center">
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      <MultiCardItemSkeleton.Carousel />
    </div>
  );
}
