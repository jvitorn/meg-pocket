"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PersonagemInterface } from "@/types";
import { setPersonagemValores } from "@/services/personagemService";
import { StatDrawer } from "@/components/stat-drawer";
import { Bolt } from "lucide-react";

interface Props {
  personagem: PersonagemInterface;
  setPersonagem: React.Dispatch<React.SetStateAction<PersonagemInterface | null>>;
  canEdit: boolean;
}

export function PersonagemBarras({ personagem, setPersonagem, canEdit }: Props) {
  const pathname = usePathname();
  const isSpecialRoute = pathname?.startsWith("/personagens/especial/");
  /* Drawers locais */
  const [hpDrawerOpen, setHpDrawerOpen] = useState(false);
  const [manaDrawerOpen, setManaDrawerOpen] = useState(false);
  const [defesaDrawerOpen, setDefesaDrawerOpen] = useState(false);

  /* Atualizar HP — idêntico ao original */
  const handleAtualizarHP = useCallback(
    async (novoValor: number) => {
      if (!canEdit) return;
      const antigoHP = personagem.hp_atual ?? 0;
      const maxHP = personagem.hp ?? 0;
      const novo = Math.max(0, Math.min(maxHP, novoValor));

      // otimista
      setPersonagem((p) => (p ? { ...p, hp_atual: novo } : p));

      toast.loading("Atualizando HP...");

      try {
        const response = await setPersonagemValores(personagem.id, "hp_atual", novo);
        setPersonagem((p) =>
          p
            ? {
                ...p,
                hp_atual: response.personagem?.hp_atual ?? novo,
                hp: response.personagem?.hp ?? p.hp,
              }
            : p
        );
        toast.dismiss();
        toast.success(`HP atualizado: ${response.personagem?.hp_atual ?? novo}`);
      } catch {
        setPersonagem((p) => (p ? { ...p, hp_atual: antigoHP } : p));
        toast.dismiss();
        toast.error("Não foi possível atualizar o HP.");
      }
    },
    [canEdit, personagem, setPersonagem]
  );

  /* Atualizar Mana — idêntico ao original */
  const handleAtualizarMana = useCallback(
    async (novoValor: number) => {
      if (!canEdit) return;
      const antigo = personagem.mana_atual ?? 0;
      const max = personagem.mana ?? 0;
      const novo = Math.max(0, Math.min(max, novoValor));

      setPersonagem((p) => (p ? { ...p, mana_atual: novo } : p));

      toast.loading("Atualizando mana...");

      try {
        const response = await setPersonagemValores(personagem.id, "mana_atual", novo);
        setPersonagem((p) =>
          p
            ? {
                ...p,
                mana_atual: response.personagem?.mana_atual ?? novo,
                mana: response.personagem?.mana ?? p.mana,
              }
            : p
        );
        toast.dismiss();
        toast.success(`Mana atualizada: ${response.personagem?.mana_atual ?? novo}`);
      } catch {
        setPersonagem((p) => (p ? { ...p, mana_atual: antigo } : p));
        toast.dismiss();
        toast.error("Não foi possível atualizar a mana.");
      }
    },
    [canEdit, personagem, setPersonagem]
  );

  const handleAtualizarDefesa = useCallback(
    async (novoValor: number) => {
      if (!canEdit) return;
      const antigo = personagem.defesa_atual ?? 0;
      const max = personagem.defesa_max ?? 0;
      const novo = Math.max(0, Math.min(max, novoValor));

      setPersonagem((p) => (p ? { ...p, defesa_atual: novo, defesa_max: novo === 0 ? 0 : (p.defesa_max ?? 0) } : p));

      toast.loading("Atualizando defesa...");

      try {
        const response = await setPersonagemValores(personagem.id, "defesa_atual", novo);
        setPersonagem((p) =>
          p
            ? {
                ...p,
                defesa_atual: response.personagem?.defesa_atual ?? novo,
                defesa_max:
                  response.personagem?.defesa_max ??
                  (novo === 0 ? 0 : (p.defesa_max ?? 0)),
                inventario: response.inventario ?? p.inventario,
                inventarioResumo:
                  response.inventarioResumo ?? p.inventarioResumo,
              }
            : p
        );
        toast.dismiss();
        toast.success(`Defesa atualizada: ${response.personagem?.defesa_atual ?? novo}`);
      } catch {
        setPersonagem((p) =>
          p ? { ...p, defesa_atual: antigo, defesa_max: personagem.defesa_max ?? 0 } : p
        );
        toast.dismiss();
        toast.error("Não foi possível atualizar a defesa.");
      }
    },
    [canEdit, personagem, setPersonagem]
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
  const defesaPercent =
    personagem.defesa_max && personagem.defesa_max > 0
      ? Math.round(((personagem.defesa_atual ?? 0) / personagem.defesa_max) * 100)
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

          <div className="w-full h-2 overflow-hidden rounded bg-slate-200 dark:bg-white/6">
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

          <div className="w-full h-2 overflow-hidden rounded bg-slate-200 dark:bg-white/6">
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

        {(personagem.defesa_max ?? 0) > 0 ? (
          <div>
            <div className="flex justify-between items-center text-[12px] text-muted-foreground mb-1">
              <span className="font-medium">Defesa</span>
              <span className="text-xs" aria-live="polite">
                {personagem.defesa_atual ?? 0}/{personagem.defesa_max ?? 0}
              </span>
            </div>

            <div className="w-full h-2 overflow-hidden rounded bg-amber-100 dark:bg-white/6">
              <motion.div
                className="h-full bg-amber-400"
                initial={false}
                animate={{
                  width: `${Math.max(0, Math.min(100, defesaPercent))}%`,
                }}
                transition={{ type: "tween", duration: 0.45 }}
              />
            </div>
          </div>
        ) : null}

        {/* AÇÕES RÁPIDAS — idêntico ao original */}
        <div className="mt-2 space-y-2 w-full mb-2">
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setHpDrawerOpen(true)}
              disabled={!canEdit}
              className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/4 dark:hover:bg-white/6"
            >
              Atualizar HP
            </button>

            <button
              onClick={() => setManaDrawerOpen(true)}
              disabled={!canEdit}
              className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/4 dark:hover:bg-white/6"
            >
              Atualizar Mana
            </button>
          </div>

          {(personagem.defesa_max ?? 0) > 0 ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setDefesaDrawerOpen(true)}
                disabled={!canEdit}
                className="flex-1 rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-500/10 dark:text-foreground dark:hover:bg-amber-500/15"
              >
                Atualizar Defesa
              </button>
            </div>
          ) : null}

          {personagem.statusEspecial && canEdit && (
            <div className="w-full">
              <button
                onClick={() => {
                  window.location.href = isSpecialRoute
                    ? `/personagens/${personagem.id}`
                    : `/personagens/especial/${personagem.id}`;
                }}
                className="w-full inline-flex items-center gap-2 justify-center px-4 py-2 rounded shadow-lg bg-linear-to-r from-purple-600 to-pink-500 text-white hover:scale-[1.025] transition-transform text-sm font-semibold"
              >
                <Bolt className="w-4 h-4" />
                {isSpecialRoute ? "Desativar ficha especial" : "Ativar ficha especial"}
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

      <StatDrawer
        title="Atualizar Defesa"
        description="Ajuste a defesa temporária ativa da ficha."
        open={defesaDrawerOpen}
        setOpen={setDefesaDrawerOpen}
        current={personagem.defesa_atual ?? 0}
        max={personagem.defesa_max ?? 0}
        onUpdate={handleAtualizarDefesa}
        unitLabel="Defesa"
      />
    </>
  );
}
