"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Bolt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MagiaDetailsDrawer } from "@/components/magia-details-drawer";
import { FichaSection } from "./FichaSection";
import { PersonagemInterface } from "@/types";
import { setPersonagemValores } from "@/services/personagemService";

type ActionAbility = NonNullable<PersonagemInterface["actions"]>[number];

interface Props {
  personagem: PersonagemInterface;
  setPersonagem: Dispatch<SetStateAction<PersonagemInterface | null>>;
  canEdit: boolean;
}

export function PersonagemActions({
  personagem,
  setPersonagem,
  canEdit,
}: Props) {
  const [selected, setSelected] = useState<ActionAbility | null>(null);
  const [loading, setLoading] = useState(false);

  const ativar = async () => {
    if (!selected) return;
    if (!canEdit) return;

    const custo = selected.custo_mana ?? 0;
    const atual = personagem.mana_atual ?? 0;

    if (atual < custo) {
      toast.error("Mana insuficiente");
      return;
    }

    const novo = atual - custo;

    toast.loading(`Usando ${selected.nome}...`);
    setLoading(true);
    setPersonagem((p) => (p ? { ...p, mana_atual: novo } : p));

    try {
      await setPersonagemValores(personagem.id, "mana_atual", novo);
      toast.dismiss();
      toast.success(`${selected.nome} ativada — mana -${custo}`);
      setSelected(null);
    } catch {
      toast.dismiss();
      toast.error("Falha ao usar a ação.");
      setPersonagem((p) => (p ? { ...p, mana_atual: atual } : p));
    } finally {
      setLoading(false);
    }
  };

  if (!personagem.actions?.length) return null;

  return (
    <>
      <FichaSection
        title="Ações"
        subtitle="Ações especiais do evento."
      >
        <div className="mt-2 space-y-3">
          {personagem.actions.map((acao, idx) => (
            <button
              key={`${acao.nome}-${idx}`}
              onClick={() => setSelected(acao)}
              className="w-full text-left bg-white/3 hover:bg-white/6 transition p-4 rounded-md flex items-start justify-between gap-4 md:p-5"
            >
              <div className="flex items-start gap-4">
                <Bolt className="w-6 h-6 mt-0.5 text-emerald-500" />

                <div className="flex-1">
                  <div className="font-semibold text-sm md:text-base text-emerald-400">
                    {acao.nome}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground line-clamp-2 md:line-clamp-3">
                    {acao.descricao}
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-start">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-background text-emerald-500 border border-emerald-500">
                  {acao.custo_mana ?? 0} mana
                </span>
              </div>
            </button>
          ))}
        </div>
      </FichaSection>

      <MagiaDetailsDrawer
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        magia={
          selected
            ? {
                nome: selected.nome,
                descricao: selected.descricao,
                alcance: "Especial",
                custo_nivel: selected.custo_mana ?? 0,
              }
            : null
        }
        description="Detalhes da ação especial do evento."
        closeLabel="Cancelar"
        footerAction={
          <Button
            onClick={ativar}
            disabled={
              !canEdit ||
              loading ||
              (personagem.mana_atual ?? 0) < (selected?.custo_mana ?? 0)
            }
          >
            {!canEdit ? "Somente leitura" : loading ? "Ativando..." : "Ativar"}
          </Button>
        }
      />
    </>
  );
}
