"use client";

import { useState, useCallback } from "react";
import { CircleDotDashed } from "lucide-react";
import { PersonagemInterface, PericiaPersonagem } from "@/types";

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

import { FichaSection } from "./FichaSection";

interface Props {
  pericias: PericiaPersonagem[];
}

export function PersonagemPericias({ pericias }: Props) {
  const [selected, setSelected] = useState<PericiaPersonagem | null>(null);

  const handleAbrir = useCallback((p: PericiaPersonagem) => {
    setSelected(p);
  }, []);

  return (
    <>
      <FichaSection
        title="Perícias"
        subtitle="Toque em uma perícia para ver detalhes."
      >
        <div className="mt-2 space-y-3">
          {Array.isArray(pericias) && pericias.length > 0 ? (
            pericias.map((pericia, idx) => (
              <button
                key={idx}
                onClick={() => handleAbrir(pericia)}
                className="w-full text-left bg-white/3 hover:bg-white/6 transition p-4 rounded-md flex items-start justify-between gap-4 md:p-5"
              >
                <div className="flex items-start gap-4">
                  <CircleDotDashed className="w-6 h-6 mt-0.5 text-red-500" />

                  <div className="flex-1">
                    <div className="font-semibold text-sm md:text-base">
                      {pericia.nome}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-start">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-background text-red-500 border border-red-500">
                    +{pericia.pontuacao ?? 0}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma perícia encontrada
            </p>
          )}
        </div>
      </FichaSection>

      {/* Modal idêntico ao original */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle>{selected?.nome ?? "Perícia"}</DialogTitle>

                <DialogDescription className="mt-1 text-sm text-muted-foreground italic">
                  Role {selected?.pontuacao}d20, escolha o maior resultado e
                  adicione +{(selected?.pontuacao ?? 0) - 1} ao valor final.
                </DialogDescription>
              </div>

              <div className="ml-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-background text-red-500 border border-red-500">
                  {selected?.tipo ?? "—"}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 max-h-[360px] overflow-y-auto rounded-md pr-2">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {selected?.descricao ??
                "Sem descrição detalhada disponível para esta perícia."}
            </p>
          </div>

          <DialogFooter>
            <div className="flex justify-end w-full gap-2">
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
