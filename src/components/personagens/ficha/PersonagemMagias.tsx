"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FichaSection } from "./FichaSection";
import { PersonagemInterface, MagiaPersonagem } from "@/types";
import { setPersonagemValores } from "@/services/personagemService";
import { Button } from "@/components/ui/button";
import { MagiaDetailsDrawer } from "@/components/magia-details-drawer";

interface Props {
  personagem: PersonagemInterface;
  setPersonagem: React.Dispatch<
    React.SetStateAction<PersonagemInterface | null>
  >;
  canEdit: boolean;
}

export function PersonagemMagias({ personagem, setPersonagem, canEdit }: Props) {
  const [selected, setSelected] = useState<MagiaPersonagem | null>(null);
  const [loading, setLoading] = useState(false);

  const conjurar = async () => {
    if (!selected) return;
    if (!canEdit) return;

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
        sectionId="magias"
        tone="sky"
      >
        <div className="mt-2 space-y-3">
          {personagem.magias?.length ? (
            personagem.magias.map((magia, idx) => (
              <button
                key={idx}
                onClick={() => setSelected(magia)}
                className="flex w-full items-start justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-left transition hover:bg-sky-100/80 dark:border-sky-500/15 dark:bg-sky-500/[0.07] dark:hover:bg-sky-500/12 md:p-5"
              >
                <div className="flex items-center gap-4">
                  <Sparkles className="h-6 w-6 text-sky-600 dark:text-blue-400" />

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
                  <span className="inline-flex items-center rounded-full border border-sky-300 bg-background px-3 py-1 text-xs font-medium text-sky-700 dark:border-blue-600 dark:text-foreground">
                    {magia.custo_nivel ?? "-"}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/6 dark:text-sky-100/75">
              Nenhuma magia disponível para este personagem no momento.
            </div>
          )}
        </div>
      </FichaSection>

      <MagiaDetailsDrawer
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        magia={selected}
        closeLabel="Cancelar"
        footerAction={
          <Button
            onClick={conjurar}
            disabled={
              !canEdit ||
              loading ||
              (personagem.mana_atual ?? 0) < (selected?.custo_nivel ?? 0)
            }
          >
            {!canEdit ? "Somente leitura" : loading ? "Ativando..." : "Ativar"}
          </Button>
        }
      />
    </>
  );
}
