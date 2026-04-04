"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  Leaf,
  Droplet,
  Flame,
  Wind,
  Shield,
  ScrollText,
  CircleDotDashed,
  Package,
  Sparkles,
  WandSparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PersonagemInterface } from "@/types";
import { cn } from "@/lib/utils";
import { PersonagemHeader } from "./ficha/PersonagemHeader";
import { PersonagemBarras } from "./ficha/PersonagemBarras";
import { PersonagemSlotsDefensivos } from "./ficha/PersonagemSlotsDefensivos";
import { PersonagemSobre } from "./ficha/PersonagemSobre";
import { PersonagemPericias } from "./ficha/PersonagemPericias";
import { PersonagemInventario } from "./ficha/PersonagemInventario";
import { PersonagemMagias } from "./ficha/PersonagemMagias";

type ElementType = "natureza" | "agua" | "fogo" | "vento";

const elements = {
  natureza: { icon: Leaf, bgColor: "bg-green-500", color: "text-green-900" },
  agua: { icon: Droplet, bgColor: "bg-blue-500", color: "text-blue-900" },
  fogo: { icon: Flame, bgColor: "bg-red-500", color: "text-red-900" },
  vento: { icon: Wind, bgColor: "bg-gray-300", color: "text-gray-700" },
};

const sectionIcons = {
  defesa: Shield,
  sobre: ScrollText,
  pericias: CircleDotDashed,
  inventario: Package,
  magias: Sparkles,
  acoes: WandSparkles,
} as const;

const sectionStyles = {
  defesa: {
    active: "border-slate-500/50 bg-slate-500/15 text-slate-100",
    inactive: "border-slate-500/25 bg-slate-500/8 text-slate-300/80",
    badge: "bg-slate-500/20 text-slate-200",
  },
  sobre: {
    active: "border-zinc-500/50 bg-zinc-500/15 text-zinc-100",
    inactive: "border-zinc-500/25 bg-zinc-500/8 text-zinc-300/80",
    badge: "bg-zinc-500/20 text-zinc-200",
  },
  pericias: {
    active: "border-orange-500/50 bg-orange-500/15 text-orange-100",
    inactive: "border-orange-500/25 bg-orange-500/8 text-orange-200/80",
    badge: "bg-orange-500/20 text-orange-100",
  },
  inventario: {
    active: "border-amber-500/50 bg-amber-500/15 text-amber-100",
    inactive: "border-amber-500/25 bg-amber-500/8 text-amber-200/80",
    badge: "bg-amber-500/20 text-amber-100",
  },
  magias: {
    active: "border-sky-500/50 bg-sky-500/15 text-sky-100",
    inactive: "border-sky-500/25 bg-sky-500/8 text-sky-200/80",
    badge: "bg-sky-500/20 text-sky-100",
  },
  acoes: {
    active: "border-emerald-500/50 bg-emerald-500/15 text-emerald-100",
    inactive: "border-emerald-500/25 bg-emerald-500/8 text-emerald-200/80",
    badge: "bg-emerald-500/20 text-emerald-100",
  },
} as const;

type SectionId = keyof typeof sectionIcons;

interface Props {
  personagem: PersonagemInterface;
  setPersonagem: Dispatch<SetStateAction<PersonagemInterface | null>>;
  canEdit: boolean;
  extraSection?: ReactNode;
}

function SectionTransition({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0, y: -8 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

export function PersonagemView({
  personagem,
  setPersonagem,
  canEdit,
  extraSection,
}: Props) {
  const [visibleSections, setVisibleSections] = useState({
    defesa: true,
    sobre: true,
    pericias: true,
    inventario: true,
    magias: true,
    acoes: true,
  });

  const elemento = (["natureza", "agua", "fogo", "vento"].includes(
    personagem.elemento as ElementType
  )
    ? personagem.elemento
    : "natureza") as ElementType;

  const ElementIcon = elements[elemento].icon;
  const hasActions = Boolean(personagem.actions?.length);
  const navItems: ReadonlyArray<{ id: SectionId; label: string; count: number | null }> = [
    { id: "defesa", label: "Defesa", count: null },
    { id: "sobre", label: "Sobre", count: null },
    { id: "pericias", label: "Perícias", count: personagem.pericias?.length ?? 0 },
    {
      id: "inventario",
      label: "Inventário",
      count: personagem.inventarioResumo?.itensTotais ?? 0,
    },
    { id: "magias", label: "Magias", count: personagem.magias?.length ?? 0 },
    ...(hasActions
      ? [
          {
            id: "acoes" as SectionId,
            label: "Ações",
            count: personagem.actions?.length ?? 0,
          },
        ]
      : []),
  ];

  const toggleSection = (sectionId: keyof typeof visibleSections) => {
    const isVisible = visibleSections[sectionId];

    if (isVisible) {
      setVisibleSections((current) => ({
        ...current,
        [sectionId]: false,
      }));
      return;
    }

    setVisibleSections((current) => ({
      ...current,
      [sectionId]: true,
    }));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  return (
    <Card className="overflow-hidden shadow-lg p-4 md:p-6 bg-background border border-border">
      {!canEdit && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Modo visualização habilitado.
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5">
          <PersonagemHeader
            nome={personagem.nome}
            classe={personagem.classe_nome}
            raca={personagem.raca_nome}
            urlImagem={personagem.url_imagem}
          />

          <PersonagemBarras
            personagem={personagem}
            setPersonagem={setPersonagem}
            canEdit={canEdit}
          />

          <AnimatePresence initial={false} mode="popLayout">
            {visibleSections.defesa ? (
              <SectionTransition key="defesa">
                <PersonagemSlotsDefensivos
                  personagemId={personagem.id}
                  slots={personagem.slotsDefensivos}
                  pericias={personagem.pericias}
                  setPersonagem={setPersonagem}
                  canEdit={canEdit}
                />
              </SectionTransition>
            ) : null}
          </AnimatePresence>
        </aside>

        <section className="min-w-0 flex flex-col gap-5">
          <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/90 p-3 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl shadow-inner",
                    elements[elemento].bgColor
                  )}
                >
                  <ElementIcon
                    className={cn("h-4 w-4", elements[elemento].color)}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Elemento
                  </p>
                  <p className="text-sm font-semibold capitalize text-foreground">
                    {elemento}
                  </p>
                </div>
              </div>

              <p className="ml-auto hidden max-w-65 text-right text-xs text-muted-foreground lg:block">
                Clique para mostrar ou ocultar seções da ficha.
              </p>
            </div>

            <div className="-mx-1 overflow-x-auto px-1 lg:overflow-visible lg:px-0">
              <div className="flex min-w-max items-center gap-2 lg:min-w-0 lg:flex-wrap">
                {navItems.map((item) => {
                  const Icon = sectionIcons[item.id];
                  const isVisible = visibleSections[item.id];
                  const style = sectionStyles[item.id];

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSection(item.id)}
                      aria-pressed={isVisible}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition whitespace-nowrap",
                        isVisible ? style.active : style.inactive
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                      {item.count !== null ? (
                        <span
                          className={cn(
                            "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                            style.badge
                          )}
                        >
                          {item.count}
                        </span>
                      ) : null}
                      {isVisible ? (
                        <ChevronUp className="h-3.5 w-3.5 opacity-70" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <AnimatePresence initial={false} mode="popLayout">
            {visibleSections.sobre ? (
              <SectionTransition key="sobre">
                <PersonagemSobre
                  personagem={personagem}
                  setPersonagem={setPersonagem}
                  canEdit={canEdit}
                />
              </SectionTransition>
            ) : null}

            {visibleSections.pericias ? (
              <SectionTransition key="pericias">
                <PersonagemPericias pericias={personagem.pericias ?? []} />
              </SectionTransition>
            ) : null}

            {visibleSections.inventario ? (
              <SectionTransition key="inventario">
                <PersonagemInventario
                  personagem={personagem}
                  setPersonagem={setPersonagem}
                  canEdit={canEdit}
                />
              </SectionTransition>
            ) : null}

            {visibleSections.magias ? (
              <SectionTransition key="magias">
                <PersonagemMagias
                  personagem={personagem}
                  setPersonagem={setPersonagem}
                  canEdit={canEdit}
                />
              </SectionTransition>
            ) : null}

            {hasActions && visibleSections.acoes ? (
              <SectionTransition key="acoes">{extraSection}</SectionTransition>
            ) : null}

            {!visibleSections.sobre &&
            !visibleSections.pericias &&
            !visibleSections.inventario &&
            !visibleSections.magias &&
            !visibleSections.defesa &&
            !(hasActions && visibleSections.acoes) ? (
              <SectionTransition key="empty-state">
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-5 text-sm text-muted-foreground">
                  Todas as seções estão ocultas no momento. Use os botões acima para reabrir a ficha.
                </div>
              </SectionTransition>
            ) : null}
          </AnimatePresence>
        </section>
      </div>
    </Card>
  );
}
