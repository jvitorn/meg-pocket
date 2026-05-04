"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shield } from "lucide-react";

import { ReactiveSlotsPanel } from "@/components/personagens/ficha/ReactiveSlotsPanel";

import {
  usarSlotDefensivo,
  resetarSlotsDefensivos,
} from "@/services/personagemService";

import {
  calcularLimiteSlotsDefensivos,
  SlotDefensivoTipo,
} from "@/lib/regras/slotsDefensivos";

import type {
  PericiaPersonagem,
  PersonagemInterface,
  SlotsDefensivos,
} from "@/types";

/* -------------------------------------------------------
   Tipos
---------------------------------------------------------*/
interface Props {
  personagemId: number;
  slots?: SlotsDefensivos;
  pericias?: PericiaPersonagem[];
  setPersonagem: React.Dispatch<
    React.SetStateAction<PersonagemInterface | null>
  >;
  canEdit: boolean;
}

/* -------------------------------------------------------
   Componente principal
---------------------------------------------------------*/
export function PersonagemSlotsDefensivos({
  personagemId,
  slots,
  pericias = [],
  setPersonagem,
  canEdit,
}: Props) {
  const [loadingSlot, setLoadingSlot] = useState<SlotDefensivoTipo | null>(null);

  /* Fallback quando não existe mecânica */
  if (!slots) {
    return (
      <section
        id="defesa"
        className="scroll-mt-32 space-y-3 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-100 via-card to-card p-4 shadow-sm backdrop-blur-sm dark:border-slate-500/20 dark:from-slate-500/10 dark:via-card/92 dark:to-card/82"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500 dark:text-slate-200" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-100">
            Slots Reativos
          </h3>
        </div>

        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-100/80 p-4 text-sm italic text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/6 dark:text-slate-100/75">
          Mecânica de defesa ainda não definida para este personagem.
        </p>
      </section>
    );
  }

  /* ---------------------------------------------------
     Cálculo de limites (REGRA ÚNICA DO SISTEMA)
  ----------------------------------------------------*/
  const limites = {
    esquiva: calcularLimiteSlotsDefensivos("esquiva", pericias),
    bloqueio: calcularLimiteSlotsDefensivos("bloqueio", pericias),
    contra: calcularLimiteSlotsDefensivos("contra", pericias),
  };

  const usados = {
    esquiva: slots.esquivaUsada,
    bloqueio: slots.bloqueioUsado,
    contra: slots.contraAtaqueUsado,
  };

  /* ---------------------------------------------------
     Usar slot (com bloqueio no FRONT)
  ----------------------------------------------------*/
  const usar = async (tipo: SlotDefensivoTipo) => {
    if (!canEdit) return;
    if (loadingSlot) return;

    if (usados[tipo] >= limites[tipo]) {
      toast.error("Limite de uso atingido para este slot");
      return;
    }

    try {
      setLoadingSlot(tipo);

      // Atualização otimista
      setPersonagem((p) => {
        if (!p?.slotsDefensivos) return p;
        return {
          ...p,
          slotsDefensivos: {
            ...p.slotsDefensivos,
            ...(tipo === "esquiva" && {
              esquivaUsada: p.slotsDefensivos.esquivaUsada + 1,
            }),
            ...(tipo === "bloqueio" && {
              bloqueioUsado: p.slotsDefensivos.bloqueioUsado + 1,
            }),
            ...(tipo === "contra" && {
              contraAtaqueUsado: p.slotsDefensivos.contraAtaqueUsado + 1,
            }),
          },
        };
      });

      await usarSlotDefensivo(personagemId, tipo);
    } catch {
      toast.error("Erro ao usar slot defensivo");
    } finally {
      setLoadingSlot(null);
    }
  };

  /* ---------------------------------------------------
     Resetar slots
  ----------------------------------------------------*/
  const resetar = async () => {
    if (!canEdit) return;
    try {
      setPersonagem((p) => {
        if (!p) return p;
        return {
          ...p,
          slotsDefensivos: {
            esquivaUsada: 0,
            bloqueioUsado: 0,
            contraAtaqueUsado: 0,
          },
        };
      });

      await resetarSlotsDefensivos(personagemId);
      toast.success("Slots reativos resetados");
    } catch {
      toast.error("Erro ao resetar slots");
    }
  };

  return (
    <ReactiveSlotsPanel
      id="defesa"
      className="mb-3"
      description={
        canEdit
          ? "Usados durante o combate"
          : "Somente leitura para esta ficha"
      }
      rows={[
        {
          tipo: "esquiva",
          usados: usados.esquiva,
          limite: limites.esquiva,
          onUse: () => usar("esquiva"),
        },
        {
          tipo: "bloqueio",
          usados: usados.bloqueio,
          limite: limites.bloqueio,
          onUse: () => usar("bloqueio"),
        },
        {
          tipo: "contra",
          usados: usados.contra,
          limite: limites.contra,
          onUse: () => usar("contra"),
        },
      ]}
      canEdit={canEdit}
      loadingSlot={loadingSlot}
      onReset={resetar}
    />
  );
}
