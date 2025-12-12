"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FichaSection } from "./FichaSection";
import { PersonagemInterface, MagiaPersonagem } from "@/types";
import { setPersonagemValores } from "@/services/personagemService";

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

interface Props {
  personagem: PersonagemInterface;
  setPersonagem: React.Dispatch<
    React.SetStateAction<PersonagemInterface | null>
  >;
}

export function PersonagemMagias({ personagem, setPersonagem }: Props) {
  const [selected, setSelected] = useState<MagiaPersonagem | null>(null);
  const [loading, setLoading] = useState(false);

  const conjurar = async () => {
    if (!selected) return;

    const custo = selected.custo_nivel ?? 0;
    const atual = personagem.mana_atual ?? 0;

    if (atual < custo) {
      toast.error("Mana insuficiente");
      return;
    }

    const novo = atual - custo;

    // RESTAURANDO TOAST ORIGINAL
    toast.loading(`Conjurando ${selected.nome}...`);
    setLoading(true);

    // Otimista
    setPersonagem((p) => (p ? { ...p, mana_atual: novo } : p));

    try {
      await setPersonagemValores(personagem.id, "mana_atual", novo);

      toast.dismiss();
      toast.success(`${selected.nome} conjurada — mana -${custo}`);

      setSelected(null);
    } catch {
      toast.dismiss();
      toast.error("Falha ao conjurar magia.");

      // rollback
      setPersonagem((p) => (p ? { ...p, mana_atual: atual } : p));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FichaSection
        title="Magias"
        subtitle="Toque em uma magia para ver detalhes."
      >
        <div className="mt-2 space-y-3">
          {personagem.magias?.length ? (
            personagem.magias.map((magia, idx) => (
              <button
                key={idx}
                onClick={() => setSelected(magia)}
                className="w-full text-left bg-white/3 hover:bg-white/6 transition p-4 rounded-md md:p-5 flex items-start justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <Sparkles className="w-6 h-6 text-blue-600" />

                  <div className="flex-1">
                    <div className="font-semibold text-sm md:text-base">
                      {magia.nome}
                    </div>

                    <div className="text-xs md:text-sm text-muted-foreground line-clamp-2 md:line-clamp-3">
                      {magia.descricao}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-start">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-background text-foreground border border-blue-600">
                    {magia.custo_nivel ?? "-"}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma magia encontrada
            </p>
          )}
        </div>
      </FichaSection>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.nome ?? "Confirmar magia"}</DialogTitle>

            <DialogDescription>
              Custo: {selected?.custo_nivel ?? 0} mana
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 max-h-[420px] overflow-y-auto rounded-md pr-2">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {selected?.descricao}
            </p>
          </div>

          <DialogFooter>
            <div className="flex gap-2 justify-end w-full">
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>

              <Button
                onClick={conjurar}
                disabled={
                  loading ||
                  (personagem.mana_atual ?? 0) < (selected?.custo_nivel ?? 0)
                }
              >
                {loading ? "Ativando..." : "Ativar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
