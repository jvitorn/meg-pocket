"use client";

import { SafeImage } from "@/components/safe-image";

interface Props {
  nome: string;
  classe?: string | null;
  raca?: string | null;
  urlImagem?: string | null;
}

export function PersonagemHeader({ nome, classe, raca, urlImagem }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 w-full">

      {/* Avatar */}
      <div className="flex justify-center w-full">
        <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-primary/20 md:h-44 md:w-44">
          <SafeImage
            src={urlImagem}
            alt={nome}
            fill
            sizes="(max-width: 768px) 128px, 176px"
            className="object-cover"
            fallbackLabel={nome}
            fallbackClassName="text-3xl"
          />
        </div>
      </div>

      {/* Nome + Classe + Raça */}
      <div className="w-full text-center">
        <h1 className="text-xl md:text-2xl font-bold capitalize">
          {nome}
        </h1>

        <div className="mt-1 flex flex-wrap gap-2 justify-center">
          {classe && (
            <span className="px-2 py-0.5 border rounded text-xs">
              {classe}
            </span>
          )}

          {raca && (
            <span className="px-2 py-0.5 border rounded text-xs">
              {raca}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
