"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PersonagemInterface } from "@/types";
import { setPersonagemValores } from "@/services/personagemService";
import { StatDrawer } from "@/components/stat-drawer";
import { Bolt } from "lucide-react";

interface Props {
  personagem: PersonagemInterface;
  setPersonagem: React.Dispatch<React.SetStateAction<PersonagemInterface | null>>;
}

export function PersonagemBarras({ personagem, setPersonagem }: Props) {
  /* Drawers locais */
  const [hpDrawerOpen, setHpDrawerOpen] = useState(false);
  const [manaDrawerOpen, setManaDrawerOpen] = useState(false);

  /* Atualizar HP — idêntico ao original */
  const handleAtualizarHP = useCallback(
    async (novoValor: number) => {
      const antigoHP = personagem.hp_atual ?? 0;
      const maxHP = personagem.hp ?? 0;
      const novo = Math.max(0, Math.min(maxHP, novoValor));

      // otimista
      setPersonagem((p) => (p ? { ...p, hp_atual: novo } : p));

      toast.loading("Atualizando HP...");

      try {
        await setPersonagemValores(personagem.id, "hp_atual", novo);
        toast.dismiss();
        toast.success(`HP atualizado: ${novo}`);
      } catch (err) {
        setPersonagem((p) => (p ? { ...p, hp_atual: antigoHP } : p));
        toast.dismiss();
        toast.error("Não foi possível atualizar o HP.");
      }
    },
    [personagem, setPersonagem]
  );

  /* Atualizar Mana — idêntico ao original */
  const handleAtualizarMana = useCallback(
    async (novoValor: number) => {
      const antigo = personagem.mana_atual ?? 0;
      const max = personagem.mana ?? 0;
      const novo = Math.max(0, Math.min(max, novoValor));

      setPersonagem((p) => (p ? { ...p, mana_atual: novo } : p));

      toast.loading("Atualizando mana...");

      try {
        await setPersonagemValores(personagem.id, "mana_atual", novo);
        toast.dismiss();
        toast.success(`Mana atualizada: ${novo}`);
      } catch (err) {
        setPersonagem((p) => (p ? { ...p, mana_atual: antigo } : p));
        toast.dismiss();
        toast.error("Não foi possível atualizar a mana.");
      }
    },
    [personagem, setPersonagem]
  );

  /* Percentuais visuais */
  const hpPercent =
    personagem.hp && personagem.hp > 0
      ? Math.round(((personagem.hp_atual ?? 0) / personagem.hp) * 100)
      : 0;

  const manaPercent =
    personagem.mana && personagem.mana > 0
      ? Math.round(((personagem.mana_atual ?? 0) / personagem.mana) * 100)
      : 0;

  return (
    <>
      <div className="w-full mt-2 space-y-3">

        {/* VIDA — idêntico ao original */}
        <div>
          <div className="flex justify-between items-center text-[12px] text-muted-foreground mb-1">
            <span className="font-medium">Vida</span>
            <span className="text-xs" aria-live="polite">
              {personagem.hp_atual ?? 0}/{personagem.hp ?? 0}
            </span>
          </div>

          <div className="w-full h-2 rounded bg-white/6 overflow-hidden">
            <motion.div
              className="h-full bg-red-500"
              initial={false}
              animate={{
                width: `${Math.max(0, Math.min(100, hpPercent))}%`,
              }}
              transition={{ type: "tween", duration: 0.45 }}
            />
          </div>
        </div>

        {/* MANA — idêntico ao original */}
        <div>
          <div className="flex justify-between items-center text-[12px] text-muted-foreground mb-1">
            <span className="font-medium">Mana</span>
            <span className="text-xs" aria-live="polite">
              {personagem.mana_atual ?? 0}/{personagem.mana ?? 0}
            </span>
          </div>

          <div className="w-full h-2 rounded bg-white/6 overflow-hidden">
            <motion.div
              className="h-full bg-purple-600"
              initial={false}
              animate={{
                width: `${Math.max(0, Math.min(100, manaPercent))}%`,
              }}
              transition={{ type: "tween", duration: 0.45 }}
            />
          </div>
        </div>

        {/* AÇÕES RÁPIDAS — idêntico ao original */}
        <div className="mt-2 space-y-2 w-full mb-2">
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setHpDrawerOpen(true)}
              className="flex-1 rounded-md px-3 py-2 bg-white/4 hover:bg-white/6 focus:outline-none focus:ring-2 focus:ring-primary/40 transition text-sm font-medium"
            >
              Atualizar HP
            </button>

            <button
              onClick={() => setManaDrawerOpen(true)}
              className="flex-1 rounded-md px-3 py-2 bg-white/4 hover:bg-white/6 focus:outline-none focus:ring-2 focus:ring-primary/40 transition text-sm font-medium"
            >
              Atualizar Mana
            </button>
          </div>

          {/* Botão Baile, igual ao original */}
          {personagem.status_baile && (
            <div className="w-full">
              <button
                onClick={() => {
                  window.location.href = `/personagens/baile/${personagem.id}`;
                }}
                className="w-full inline-flex items-center gap-2 justify-center px-4 py-2 rounded shadow-lg bg-linear-to-r from-purple-600 to-pink-500 text-white hover:scale-[1.025] transition-transform text-sm font-semibold"
              >
                <Bolt className="w-4 h-4" />
                Ativar ficha
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DRAWER DE HP */}
      <StatDrawer
        title="Atualizar Vida"
        description="Informe a quantidade de vida atual."
        open={hpDrawerOpen}
        setOpen={setHpDrawerOpen}
        current={personagem.hp_atual ?? 0}
        max={personagem.hp}
        onUpdate={handleAtualizarHP}
        unitLabel="HP"
      />

      {/* DRAWER DE MANA */}
      <StatDrawer
        title="Atualizar Mana"
        description="Informe a quantidade de mana atual."
        open={manaDrawerOpen}
        setOpen={setManaDrawerOpen}
        current={personagem.mana_atual ?? 0}
        max={personagem.mana}
        onUpdate={handleAtualizarMana}
        unitLabel="Mana"
      />
    </>
  );
}
