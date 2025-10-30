"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Info, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { renderIcon } from "@/components/render-icon";
import { cn } from "@/lib/utils";
import { BaseInterface } from "@/types";

// Interface para os props com valores opcionais
interface Props {
  selectedRace?: BaseInterface;
  url : string;
}

// Objeto padrão para a raça
const defaultRace: BaseInterface = {
  _id: 0,
  nome: "Dado nao Selecionado",
  descricao: "Selecione uma opção para visualizar suas características e informações.",
  mana:0,
  hp:0
};

export default function SelecionadoCard({
  selectedRace = defaultRace, // Valor padrão aqui
  url
}: Props) {
  // Usando a raça selecionada ou a padrão
  const race = selectedRace || defaultRace;
  return (
    <>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-xl light:shadow-xl">
        {/* Imagem */}
        <div className="relative w-full h-[280px] md:h-[360px]">
          <div className="relative w-full h-full transition-transform duration-200 ease-in-out hover:scale-110">
            <Image
              src={race.imagem_pixel ?? ""}
              alt={race.nome}
              fill
              className="object-contain h-full mx-auto light:drop-shadow-xl"
            />
          </div>
        </div>

        {/* Informações da classe */}
        <div className="flex flex-col justify-center relative">
          <h2 className="text-4xl font-extrabold tracking-tight capitalize mb-2 sm:text-center">
            {race.nome}
          </h2>
          <p
            className={cn(
              "text-sm text-zinc-450 mb-2 leading-relaxed text-justify text-amber-500"
            )}
          >
            {race.descricao}
          </p>
          
          {/* Skills - Mostrar apenas se não for a raça padrão */}
          {race.magias && (
            <div className="mt-6">
              <div className="flex flex-col items-center sm:flex-row sm:items-center md:items-center gap-4 mb-2 border-2 hover:border-foreground p-5 rounded">
                <div className="flex justify-center sm:justify-start hover:text-amber-600">
                  {renderIcon("Activity", "w-10 h-10 sm:w-12 sm:h-12")}
                </div>
                {
                    race.magias && (
                    <div className="text-center sm:text-left flex-1 ">
                        <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">{race.magias[0].nome}</h2>
                        <p className="text-zinc-600 text-sm sm:text-base hover:text-foreground">
                            {race.magias[0].descricao}
                        </p>
                    </div>
                    )
                }
               
              </div>
            </div>
          )}

          {/* Botão de detalhes - Mostrar apenas se não for a raça padrão */}
          {race._id !== 0 && (
            <div className="mt-4 flex flex-col md:flex-row gap-4">
              {/* Detalhes da raça */}
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="flex items-center gap-2 text-xs px-3 py-1 rounded-md shadow-md transition bg-zinc-800 hover:bg-zinc-700 text-white"
              >
                <Link href={`${url}`}>
                  <Info className="w-4 h-4" /> Ver detalhes
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}