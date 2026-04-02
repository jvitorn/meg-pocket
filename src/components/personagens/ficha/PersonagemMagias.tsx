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
