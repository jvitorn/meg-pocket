"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
        <div className="rounded-full overflow-hidden border-2 border-primary/20 w-32 h-32 md:w-44 md:h-44">
          <Avatar className="w-full h-full">
            <AvatarImage
              src={urlImagem ?? undefined}
              alt={nome}
              className="object-cover"
            />
            <AvatarFallback className="text-3xl font-bold">
              {nome?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
