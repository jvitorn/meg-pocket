"use client";

import Image from "next/image";
import { useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { getThemeByColor } from "@/lib/fantasyThemes";

// Props para o componente de item de card reutilizável
interface dataMulticardInterface extends BaseInterface{
  imagemPrincipal?: string | null
  imagemPerfil?: string | null
}
interface MultiCardItemProps {
  data: dataMulticardInterface; // dados da classe (ex: nome, imagem, etc.)
  isSelected?: boolean;
  onClick?: () => void; // ação ao clicar no card
  onButtonClick?: () => void; // ação ao clicar no botão interno
}

type MultiCardCarouselProps<T extends dataMulticardInterface> = {
  items: T[]; // lista de classes/personagens
  selectedId: number; // ID do item atualmente selecionado
  onSelect: (item: T) => void; // callback ao clicar num card
  onButtonClick?: (item: T) => void; // callback ao clicar no botão "ver mais"
};

// Componente visual de um card individual
export function MultiCardItem({
  data,
  isSelected,
  onClick,
  onButtonClick,
}: MultiCardItemProps) {
  const theme = getThemeByColor(data.corTema, "zinc");
  const imageSrc = data.imagemPerfil || data.imagemPrincipal || data.img || "";
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const imageFailed = Boolean(imageSrc && failedImageSrc === imageSrc);

  return (
    <Card
      style={theme.style}
      onClick={onClick}
      className={cn(
        "group relative h-55 w-full cursor-pointer overflow-hidden rounded-xl border bg-linear-to-b from-[var(--theme-soft-from)] via-background/85 to-background transition duration-200 ease-in-out hover:ring-2 hover:ring-inset hover:ring-offset-0",
        theme.frameClass,
        isSelected && "ring-2 ring-[color:var(--theme-ring)] ring-inset ring-offset-0"
      )}
    >
      <div className="pointer-events-none absolute -right-9 -top-10 h-28 w-28 rounded-full border border-[color:var(--theme-ring)] opacity-40 transition-colors duration-300" />
      <div className="pointer-events-none absolute left-1/2 top-14 h-20 w-20 -translate-x-1/2 rounded-full border border-[color:var(--theme-chip-border)] opacity-30 transition-colors duration-300" />

      {/* Degradê de sombra na base do card */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t dark:from-black/80 from-white/80 to-transparent z-10 pointer-events-none" />

      {/* Cabeçalho com nome e título da classe */}
      <CardHeader className="relative z-20 flex flex-col items-center justify-center gap-4 transition-all duration-200 ease-in-out group-hover:-translate-y-1">
        <CardTitle className="text-xl text-center uppercase">
          {data.nome}
        </CardTitle>
      </CardHeader>
      {/* Imagem central da classe */}
      <CardContent className="relative z-20 flex justify-center -mt-1 overflow-visible">
        <div className="relative z-30 flex h-25 w-25 items-center justify-center transition-transform duration-200 ease-in-out will-change-transform group-hover:scale-[1.5]">
          {imageSrc && !imageFailed ? (
            <Image
              src={imageSrc}
              alt={data.nome}
              fill
              className="object-contain drop-shadow-md"
              onError={() => setFailedImageSrc(imageSrc)}
            />
          ) : (
            <div className="flex h-18 w-18 items-center justify-center rounded-full border border-[color:var(--theme-chip-border)] bg-[var(--theme-chip-bg)] text-[var(--theme-icon)] shadow-sm backdrop-blur-sm">
              <User className="h-9 w-9" aria-hidden="true" />
            </div>
          )}
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
MultiCardItem.Carousel = function CarouselComponent<T extends dataMulticardInterface>({
  items,
  selectedId,
  onSelect,
  onButtonClick,
}: MultiCardCarouselProps<T>) {
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
