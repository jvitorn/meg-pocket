import { Skeleton } from "@/components/ui/skeleton";

export default function SelectedCardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-xl">
      {/* Imagem */}
      <Skeleton className="relative w-full h-[280px] md:h-[360px] rounded-xl" />
      {/* Informações */}
      <div className="flex flex-col justify-center space-y-4">
        <Skeleton className="h-8 w-2/3" /> {/* Nome */}
        <Skeleton className="h-4 w-1/3" /> {/* Subtítulo */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[90%]" />
        </div>
        {/* Círculos de spells */}
        <div className="flex gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-10 h-10 rounded-full" />
          ))}
        </div>
        {/* Caixa de skill */}
        <Skeleton className="h-20 rounded-md mt-4" />
        {/* Botão */}
        <Skeleton className="mt-6 w-44 h-8 rounded-md self-end" />
      </div>
    </div>
  );
}