"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { BaseInterface } from "@/types";
import { cn } from "@/lib/utils";
import { getColorClasses } from "@/lib/utils";

// Props para o componente de item de card reutilizável
interface MultiCardItemProps {
  data: BaseInterface; // dados da classe (ex: nome, imagem, etc.)
  isSelected?: boolean;
  onClick?: () => void; // ação ao clicar no card
  onButtonClick?: () => void; // ação ao clicar no botão interno
}

// Componente visual de um card individual
export function MultiCardItem({
  data,
  isSelected,
  onClick,
  onButtonClick,
}: MultiCardItemProps) {
  return (
    <Card
      onClick={onClick}
      className={`relative h-[220px] w-full cursor-pointer overflow-hidden rounded-xl border border-zinc-700 hover:ring-2 hover:ring-inset hover:ring-offset-0transition-all duration-200 ease-in-out group
        ${isSelected ? "ring-2 ring-purple-500 ring-offset-0 ring-inset" : ""}`}
    >
      {/* Degradê de sombra na base do card */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t dark:from-black/80 from-white/80 to-transparent z-10 pointer-events-none" />

      {/* Cabeçalho com nome e título da classe */}
      <CardHeader className="relative flex flex-col items-center justify-center gap-4 transition-all duration-200 ease-in-out group-hover:-translate-y-1">
        <CardTitle className="text-xl text-center uppercase">
          {data.nome}
        </CardTitle>
      </CardHeader>
      {/* Imagem central da classe */}
      <CardContent className="relative z-20 flex justify-center -mt-1 overflow-visible">
        <div className="relative w-[100px] h-[100px] z-30 transition-transform duration-200 ease-in-out group-hover:scale-[1.5] will-change-transform">
          <Image
            src={data.imagem_pixel || ""}
            alt={data.nome}
            fill
            className="object-contain drop-shadow-md"
          />
        </div>
      </CardContent>

      {/* Botão interno do card (visível no hover) */}
      <MultiCardItem.Button onClick={onButtonClick} />
    </Card>
  );
}

// Subcomponente de botão usado dentro de cada card
MultiCardItem.Button = function ButtonComponent({
  onClick,
}: {
  onClick?: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <Button
        variant="secondary"
        size="sm"
        className="px-3 py-1 text-xs font-medium cursor-pointer uppercase"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        Ver mais
      </Button>
    </div>
  );
};

// Componente de carrossel que renderiza vários MultiCardItem
MultiCardItem.Carousel = function CarouselComponent({
  items,
  selectedId,
  onSelect,
  onButtonClick,
}: {
  items: BaseInterface[]; // lista de classes
  selectedId: number; // ID do item atualmente selecionado
  onSelect: (item: any) => void; // callback ao clicar num card
  onButtonClick?: (item: any) => void; // callback ao clicar no botão "ver mais"
}) {
  return (
    <Carousel
      opts={{ align: "start" }}
      className="w-full max-w-7xl mx-auto px-16"
    >
      <CarouselContent className="-ml-2 pr-2">
        {items.map((item, index) => (
          <CarouselItem
            key={item.id || index}
            className="pl-2 sm:basis-1/2 md:basis-1/3 lg:basis-1/5 xl:basis-1/6"
          >
            <MultiCardItem
              data={item}
              isSelected={item.id === selectedId}
              onClick={() => onSelect(item)}
              onButtonClick={() => onButtonClick?.(item)}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10" />
      <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10" />
    </Carousel>
  );
};