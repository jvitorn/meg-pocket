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
import { RaceInterface } from "@/types";

interface Props {
  selectedRace: RaceInterface ;
}

export default function SelectedRaceCard({
  selectedRace,
}: Props) {
   const [isModalOpen, setIsModalOpen] = useState(false);

   // === MOCK TEMPORÁRIO PARA TESTES DO MODAL ===
  const mockAdvantages = [
    "Adaptabilidade em diferentes ambientes.",
    "Aprendizado rápido de novas habilidades.",
    "Capacidade de usar qualquer tipo de arma ou magia.",
  ];

  const mockDisadvantages = [
    "Menor resistência física comparada a outras raças.",
    "Sensibilidade ao frio extremo.",
    "Desvantagem em combates contra criaturas sobrenaturais.",
  ];
  // ============================================

  return (
    <>
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-xl light:shadow-xl">
      {/* Imagem */}
      <div className="relative w-full h-[280px] md:h-[360px]">
        <div className="relative w-full h-full transition-transform duration-200 ease-in-out hover:scale-110">
          <Image
            src={"/imgs/avatars/wizardIcon.png"}
            alt={selectedRace.name}
            fill
            className="object-contain h-full mx-auto light:drop-shadow-xl"
          />
        </div>
      </div>

      {/* Informações da classe */}
      <div className="flex flex-col justify-center relative">
        <h2 className="text-4xl font-extrabold captalize mb-2">
          {selectedRace.name}
        </h2>
        <p
          className={cn(
            "text-sm text-zinc-450 mb-2 leading-relaxed text-justify text-amber-500"
          )}
        >
          {selectedRace.description}
        </p>
        {/* Skills */}
        <div className="mt-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-center md:items-center gap-4 mb-2 border-2 p-5 rounded">
  
  <div className="flex justify-center sm:justify-start hover:text-amber-600">
    {renderIcon("Activity", "w-10 h-10 sm:w-12 sm:h-12")}
  </div>
  
  
  <div className="text-center sm:text-left flex-1">
    <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">Determinação</h2>
    <p className="text-zinc-600 text-sm sm:text-base hover:text-zinc-500">
      Pode escolher um atributo para receber um bônus temporário de +4 em um teste ou ataque,
      refletindo sua adaptabilidade nas situações mais adversas.
      Em Combate será um aumento em até 2 turnos. 
      Fora de combate esse aumento irá funcionar em no máximo 5min.
    </p>
  </div>
</div>
        </div>

        {/* Botão de detalhes */}
        <div className="mt-4 flex flex-col md:flex-row gap-4">
          {/* Vantagens */}
          <Button
            
            variant="ghost"
            size="lg"
             onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 text-xs px-3 py-1 rounded-md shadow-md transition bg-transparent text-emerald-500 border-2 border-emerald-500 hover:bg-emerald-500 hover:text-white"
          >
            <Plus className="w-4 h-4" /> Vantagens
          </Button>
          {/* Desvantagens */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 text-xs px-3 py-1 rounded-md shadow-md transition bg-transparent text-red-500 border-2 border-red-500 hover:bg-red-500 hover:text-white"
          >
            <Minus className="w-4 h-4" /> Desvantagens
          </Button>
          {/* Detalhes da raça */}
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="flex items-center gap-2 text-xs px-3 py-1 rounded-md shadow-md transition bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            <Link href={`/race/details/${selectedRace.id}`}>
              <Info className="w-4 h-4" /> Ver detalhes da raça
            </Link>
          </Button>
        </div>
      </div>
    </div>

     {/* Modal de Vantagens e Desvantagens */}
<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
  <DialogContent className="rounded-lg shadow-lg overflow-hidden max-w-3xl w-full p-0">
    <DialogHeader className="border-b p-6">
      <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
        {selectedRace.name}
      </DialogTitle>
      <DialogDescription className="text-gray-600 dark:text-gray-300">
        Veja as vantagens e desvantagens desta raça.
      </DialogDescription>
    </DialogHeader>

    <div className="p-6 flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-6">
      {/* Vantagens */}
      <div className="dark:bg-emerald-900/20 p-4 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-3 text-emerald-500">Vantagens</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 dark:text-gray-200">
          {mockAdvantages.map((advantage, index) => (
            <li key={`adv-${index}`} className="flex items-start gap-2">
              <span className="mt-1">{renderIcon("Check", "text-emerald-500")}</span>
              <span>{advantage}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Desvantagens */}
      <div className="dark:bg-red-900/20 p-4 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-3 text-red-500">Desvantagens</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 dark:text-gray-200">
          {mockDisadvantages.map((disadvantage, index) => (
            <li key={`dis-${index}`} className="flex items-start gap-2">
              <span className="mt-1">{renderIcon("X", "text-red-500")}</span>
              <span>{disadvantage}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </DialogContent>
</Dialog>
    </>
  );
}