import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton"; // ← usando o componente padrão do ShadCN

function SkeletonCard({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn("min-w-[220px] h-[280px] rounded-lg shadow-md", className)}
    />
  );
}

function Carousel() {
  return (
    <div className="flex gap-4 overflow-x-auto px-4 pl-2 sm:basis-1/2 md:basis-1/3 lg:basis-1/5 xl:basis-1/6">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export const MultiCardItemSkeleton = {
  Carousel,
};
