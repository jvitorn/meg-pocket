"use client";

import { useState, useCallback } from "react";
import { CircleDotDashed } from "lucide-react";
import { PericiaPersonagem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RolagemAcao } from "@/components/RolagemDados";
import { FichaSection } from "./FichaSection";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------
   Mapa de cores por tipo de perícia
---------------------------------------------------------*/
const periciaColors: Record<string, { text: string; border: string }> = {
  luta: {
    text: "text-red-500",
    border: "border-red-500",
  },
  suporte: {
    text: "text-green-500",
    border: "border-green-500",
  },
  conhecimento: {
    text: "text-orange-500",
    border: "border-orange-500",
  },
  etica: {
    text: "text-slate-500",
    border: "border-slate-500",
  },
};

/* Normaliza o tipo e obtém as cores corretas */
function getPericiaColor(tipo?: string) {
  if (!tipo) return periciaColors["conhecimento"];
  const key = tipo.toLowerCase().trim();
  return periciaColors[key] ?? periciaColors["conhecimento"];
}

function buildPericiaNotation(pontuacao?: number) {
  const quantidade = Math.max(1, pontuacao ?? 1);
  const bonus = Math.max(0, quantidade - 1);

  return bonus > 0 ? `${quantidade}d20kh1+${bonus}` : `${quantidade}d20kh1`;
}

/* -------------------------------------------------------
   Componente principal
---------------------------------------------------------*/
interface Props {
  pericias: PericiaPersonagem[];
  canEdit: boolean;
}

export function PersonagemPericias({ pericias, canEdit}: Props) {
  const [selected, setSelected] = useState<PericiaPersonagem | null>(null);

  const handleAbrir = useCallback((p: PericiaPersonagem) => {
    setSelected(p);
  }, []);
  const quantidadeRolagem = Math.max(1, selected?.pontuacao ?? 1);
  const bonusRolagem = Math.max(0, quantidadeRolagem - 1);
  const notacaoRolagem = selected
    ? buildPericiaNotation(selected.pontuacao)
    : null;

  return (
    <>
      {/* Seção da lista */}
      <FichaSection
        title="Perícias"
        subtitle="Toque em uma perícia para ver detalhes."
        sectionId="pericias"
        tone="orange"
      >
        <div className="mt-2 space-y-3">
          {Array.isArray(pericias) && pericias.length > 0 ? (
            pericias.map((pericia, idx) => {
              const color = getPericiaColor(pericia.tipo);

              return (
                <button
                  key={idx}
                  onClick={() => handleAbrir(pericia)}
                  className="flex w-full items-start justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50/80 p-4 text-left transition hover:bg-orange-100/80 dark:border-orange-500/15 dark:bg-orange-500/[0.07] dark:hover:bg-orange-500/12 md:p-5"
                >
                  <div className="flex items-start gap-4">
                    <CircleDotDashed
                      className={cn("w-6 h-6 mt-0.5", color.text)}
                    />

                    <div className="flex-1">
                      <div className="font-semibold text-sm md:text-base">
                        {pericia.nome}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-start">
                    <span
                      className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-background border",
                        color.text,
                        color.border
                      )}
                    >
                      +{pericia.pontuacao ?? 0}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/80 p-4 text-sm text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/6 dark:text-orange-100/75">
              Nenhuma perícia configurada para esta ficha ainda.
            </div>
          )}
        </div>
      </FichaSection>

      {/* Modal de detalhes */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-2">

  {/* Título */}
  <DialogTitle className="text-center sm:text-left">
    {selected?.nome ?? "Perícia"}
  </DialogTitle>

  {/* Badge abaixo, centralizada no mobile, alinhada no desktop */}
  {selected?.tipo && (
    <div className="flex justify-center sm:justify-start">
      <span
        className={cn(
          "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-background border",
          getPericiaColor(selected.tipo).text,
          getPericiaColor(selected.tipo).border
        )}
      >
        {selected.tipo}
      </span>
    </div>
  )}

  {/* Descrição */}
  <DialogDescription className="text-sm text-muted-foreground italic text-center sm:text-left">
    Role {quantidadeRolagem}d20, escolha o maior resultado e adicione +
    {bonusRolagem} ao valor final.
  </DialogDescription>

</DialogHeader>
          {/* Conteúdo rolável */}
         <div
  className="p-4 max-h-90 overflow-y-auto pr-2 rounded-md
             scrollbar-thin scrollbar-thumb-foreground/30 scrollbar-track-transparent
             hover:scrollbar-thumb-foreground/50"
>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {selected?.descricao ??
                "Sem descrição detalhada disponível para esta perícia."}
            </p>
          </div>

          <DialogFooter>
            <div className="flex justify-end w-full gap-2">
              {selected && notacaoRolagem ? (
                <RolagemAcao
                  notacao={notacaoRolagem}
                  titulo={`Rolagem de ${selected.nome}`}
                  descricao={`Confira abaixo o resultado de ${notacaoRolagem}.`}
                  buttonLabel={`Rolar Pericia`}
                  buttonVariant="secondary"
                  disabled ={!canEdit}
                />
              ) : null}

              <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
              </DialogClose>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
