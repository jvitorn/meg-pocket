"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Shield,
  Wind,
  ShieldCheck,
  Swords,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  usarSlotDefensivo,
  resetarSlotsDefensivos,
} from "@/services/personagemService";

import {
  calcularLimiteSlotsDefensivos,
  SlotDefensivoTipo,
} from "@/lib/regras/slotsDefensivos";

import type { PericiaPersonagem, SlotsDefensivos } from "@/types";

/* -------------------------------------------------------
   Tipos
---------------------------------------------------------*/
interface Props {
  personagemId: number;
  slots?: SlotsDefensivos;
  pericias?: PericiaPersonagem[];
  setPersonagem: React.Dispatch<any>;
}

/* -------------------------------------------------------
   Cores sutis por tipo
---------------------------------------------------------*/
const slotStyle = {
  esquiva: {
    icon: "text-slate-400",
    text: "text-slate-500",
  },
  bloqueio: {
    icon: "text-zinc-400",
    text: "text-zinc-500",
  },
  contra: {
    icon: "text-stone-400",
    text: "text-stone-500",
  },
};

/* -------------------------------------------------------
   Visual dos slots
---------------------------------------------------------*/
function SlotsVisual({
  usados,
  limite,
}: {
  usados: number;
  limite: number;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: limite }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-3 h-3 rounded-sm border transition",
            i < usados
              ? "bg-foreground border-foreground"
              : "border-muted-foreground/40"
          )}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------
   Componente principal
---------------------------------------------------------*/
export function PersonagemSlotsDefensivos({
  personagemId,
  slots,
  pericias = [],
  setPersonagem,
}: Props) {
  const [loadingSlot, setLoadingSlot] = useState<SlotDefensivoTipo | null>(null);

  /* Fallback quando não existe mecânica */
  if (!slots) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Slots Reativos
          </h3>
        </div>

        <p className="text-sm text-muted-foreground italic">
          Mecânica de defesa ainda não definida para este personagem.
        </p>
      </div>
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
    if (loadingSlot) return;

    if (usados[tipo] >= limites[tipo]) {
      toast.error("Limite de uso atingido para este slot");
      return;
    }

    try {
      setLoadingSlot(tipo);

      // Atualização otimista
      setPersonagem((p: any) => ({
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
      }));

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
    try {
      setPersonagem((p: any) => ({
        ...p,
        slotsDefensivos: {
          esquivaUsada: 0,
          bloqueioUsado: 0,
          contraAtaqueUsado: 0,
        },
      }));

      await resetarSlotsDefensivos(personagemId);
      toast.success("Slots reativos resetados");
    } catch {
      toast.error("Erro ao resetar slots");
    }
  };

  return (
    <div className="space-y-4 mb-3">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <div>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Slots Reativos
            </h3>
            <p className="text-xs text-muted-foreground">
              Usados durante o combate
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={resetar}>
          Resetar
        </Button>
      </div>

      <Separator />

      {/* Esquiva */}
      <motion.div
        className="flex items-center justify-between gap-3"
        animate={{ opacity: loadingSlot === "esquiva" ? 0.6 : 1 }}
      >
        <div className="flex items-center gap-2 min-w-[110px]">
          <Wind className={cn("w-4 h-4", slotStyle.esquiva.icon)} />
          <span className={cn("text-sm font-medium", slotStyle.esquiva.text)}>
            Esquiva
          </span>
        </div>

        <SlotsVisual
          usados={usados.esquiva}
          limite={limites.esquiva}
        />

        <Button
          size="sm"
          disabled={
            loadingSlot === "esquiva" ||
            usados.esquiva >= limites.esquiva
          }
          onClick={() => usar("esquiva")}
        >
          Usar
        </Button>
      </motion.div>

      {/* Bloqueio */}
      <motion.div
        className="flex items-center justify-between gap-3"
        animate={{ opacity: loadingSlot === "bloqueio" ? 0.6 : 1 }}
      >
        <div className="flex items-center gap-2 min-w-[110px]">
          <ShieldCheck className={cn("w-4 h-4", slotStyle.bloqueio.icon)} />
          <span className={cn("text-sm font-medium", slotStyle.bloqueio.text)}>
            Bloqueio
          </span>
        </div>

        <SlotsVisual
          usados={usados.bloqueio}
          limite={limites.bloqueio}
        />

        <Button
          size="sm"
          disabled={
            loadingSlot === "bloqueio" ||
            usados.bloqueio >= limites.bloqueio
          }
          onClick={() => usar("bloqueio")}
        >
          Usar
        </Button>
      </motion.div>

      {/* Contra-ataque */}
      <motion.div
        className="flex items-center justify-between gap-3"
        animate={{ opacity: loadingSlot === "contra" ? 0.6 : 1 }}
      >
        <div className="flex items-center gap-2 min-w-[110px]">
          <Swords className={cn("w-4 h-4", slotStyle.contra.icon)} />
          <span className={cn("text-sm font-medium", slotStyle.contra.text)}>
            Contra
          </span>
        </div>

        <SlotsVisual
          usados={usados.contra}
          limite={limites.contra}
        />

        <Button
          size="sm"
          disabled={
            loadingSlot === "contra" ||
            usados.contra >= limites.contra
          }
          onClick={() => usar("contra")}
        >
          Usar
        </Button>
      </motion.div>
      <Separator />
    </div>
  );
}
