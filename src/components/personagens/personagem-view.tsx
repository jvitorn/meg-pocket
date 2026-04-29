"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useState } from "react";
import { AnimatePresence, motion, easeInOut } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Leaf, Droplet, Flame, Wind } from "lucide-react";
import { PersonagemInterface } from "@/types";
import { cn } from "@/lib/utils";
import { PersonagemHeader } from "@/components/personagens/ficha/PersonagemHeader";
import { PersonagemBarras } from "@/components/personagens/ficha/PersonagemBarras";
import { PersonagemSlotsDefensivos } from "@/components/personagens/ficha/PersonagemSlotsDefensivos";
import { PersonagemSobre } from "@/components/personagens/ficha/PersonagemSobre";
import { PersonagemPericias } from "@/components/personagens/ficha/PersonagemPericias";
import { PersonagemInventario } from "@/components/personagens/ficha/PersonagemInventario";
import { PersonagemMagias } from "@/components/personagens/ficha/PersonagemMagias";
import {
  PersonagemSectionId,
  PersonagemSectionNav,
} from "@/components/personagens/ficha/PersonagemSectionNav";
import { PersonagemPainelRolagem } from "@/components/personagens/ficha/PersonagemPainelRolagem";
import { PersonagemAnotacoes } from "@/components/personagens/ficha/PersonagemAnotacoes";
import { getThemeByColor } from "@/lib/fantasyThemes";

type ElementType = "natureza" | "agua" | "fogo" | "vento";

const elements = {
  natureza: {
    icon: Leaf,
    bgColor: "bg-green-500",
  },
  agua: {
    icon: Droplet,
    bgColor: "bg-blue-500",
  },
  fogo: {
    icon: Flame,
    bgColor: "bg-red-500",
  },
  vento: {
    icon: Wind,
    bgColor: "bg-slate-500",
  },
};

const elementIconMotion = {
  natureza: {
    animate: {
      rotate: [-7, 7],
      y: [0, -1.5],
    },
    transition: {
      rotate: {
        duration: 2.4,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
      y: {
        duration: 1.9,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
    style: { transformOrigin: "40% 80%", willChange: "transform" },
  },
  agua: {
    animate: {
      y: [-1.5, 1.5],
      scaleX: [1.04, 0.96],
      scaleY: [0.96, 1.08],
    },
    transition: {
      y: {
        duration: 1.8,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
      scaleX: {
        duration: 1.8,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
      scaleY: {
        duration: 1.8,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
    style: { transformOrigin: "50% 60%", willChange: "transform" },
  },
  fogo: {
    animate: {
      y: [0, -2],
      rotate: [-3, 3],
      scaleX: [1.03, 0.97],
      scaleY: [0.98, 1.12],
    },
    transition: {
      y: {
        duration: 0.9,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
      rotate: {
        duration: 1.15,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
      scaleX: {
        duration: 0.9,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
      scaleY: {
        duration: 0.9,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
    style: { transformOrigin: "50% 80%", willChange: "transform" },
  },
  vento: {
    animate: {
      x: [-2.5, 2.5],
      rotate: [-3, 3],
      scaleX: [0.98, 1.06],
    },
    transition: {
      x: {
        duration: 1.5,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
      rotate: {
        duration: 2,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
      scaleX: {
        duration: 1.5,
        ease: easeInOut,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
    style: { transformOrigin: "50% 50%", willChange: "transform" },
  },
};

interface Props {
  personagem: PersonagemInterface;
  setPersonagem: Dispatch<SetStateAction<PersonagemInterface | null>>;
  canEdit: boolean;
  extraSection?: ReactNode;
  expanded?: boolean;
}

function SectionTransition({ children }: { children: ReactNode }) {
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
  expanded = false,
}: Props) {
  const [visibleSections, setVisibleSections] = useState({
    anotacoes: true,
    defesa: true,
    sobre: true,
    pericias: true,
    inventario: true,
    magias: true,
    acoes: true,
    rolagem: true,
  });

  const elemento = (
    ["natureza", "agua", "fogo", "vento"].includes(
      personagem.elemento as ElementType,
    )
      ? personagem.elemento
      : "natureza"
  ) as ElementType;

  const ElementIcon = elements[elemento].icon;
  const fichaTheme = getThemeByColor(personagem.corTema, "violet");
  const hasActions = Boolean(personagem.actions?.length);
  const navItems: ReadonlyArray<{
    id: PersonagemSectionId;
    label: string;
    count: number | null;
    isVisible: boolean;
  }> = [
    {
      id: "anotacoes",
      label: "Anotações",
      count: null,
      isVisible: visibleSections.anotacoes,
    },
    {
      id: "rolagem",
      label: "Rolagem",
      count: null,
      isVisible: visibleSections.rolagem,
    },
    {
      id: "defesa",
      label: "Defesa",
      count: null,
      isVisible: visibleSections.defesa,
    },
    {
      id: "sobre",
      label: "Sobre",
      count: null,
      isVisible: visibleSections.sobre,
    },
    {
      id: "pericias",
      label: "Perícias",
      count: personagem.pericias?.length ?? 0,
      isVisible: visibleSections.pericias,
    },
    {
      id: "inventario",
      label: "Inventário",
      count: personagem.inventarioResumo?.itensTotais ?? 0,
      isVisible: visibleSections.inventario,
    },
    {
      id: "magias",
      label: "Magias",
      count: personagem.magias?.length ?? 0,
      isVisible: visibleSections.magias,
    },
    ...(hasActions
      ? [
          {
            id: "acoes" as PersonagemSectionId,
            label: "Ações",
            count: personagem.actions?.length ?? 0,
            isVisible: visibleSections.acoes,
          },
        ]
      : []),
  ];

  const scrollSectionIntoView = (sectionId: PersonagemSectionId) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    });
  };

  const navigateToSection = (sectionId: PersonagemSectionId) => {
    const isVisible = visibleSections[sectionId];

    if (isVisible) {
      scrollSectionIntoView(sectionId);
      return;
    }

    setVisibleSections((current) => ({
      ...current,
      [sectionId]: true,
    }));
    scrollSectionIntoView(sectionId);
  };

  const toggleSection = (sectionId: PersonagemSectionId) => {
    setVisibleSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const fichaOverview = (
    <>
      <div className="relative isolate flex items-center gap-3 overflow-hidden rounded-2xl border border-(--theme-chip-border) bg-(--theme-surface-muted) px-4 py-3 shadow-sm backdrop-blur">
        <div className="pointer-events-none absolute -right-4 -top-8 -z-10 h-20 w-20 rounded-full bg-(--theme-glow) blur-2xl animate-soft-pulse animation-duration-[3.8s]" />
        <div className="pointer-events-none absolute bottom-2 right-12 -z-10 h-6 w-16 rotate-12 rounded-full border border-(--theme-chip-border) bg-(--theme-surface-strong) animate-soft-pulse [--pulse-opacity-max:0.34] [--pulse-opacity-min:0.1] [animation-delay:0.9s] animation-duration-[3.6s]" />
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl shadow-inner",
            elements[elemento].bgColor,
          )}
        >
          <motion.div
            className="flex h-6 w-6 items-center justify-center text-white"
            {...elementIconMotion[elemento]}
          >
            <ElementIcon className="h-6 w-6" />
          </motion.div>
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

      <PersonagemSectionNav
        items={navItems}
        onNavigate={navigateToSection}
        onToggle={toggleSection}
      />
    </>
  );

  return (
    <Card
      style={fichaTheme.style}
      className={cn(
        "relative isolate overflow-hidden border border-(--theme-frame) bg-[linear-gradient(145deg,var(--theme-surface-strong),var(--theme-surface)_46%,var(--background))] p-4 shadow-lg backdrop-blur-sm md:p-6",
        expanded &&
          "rounded-none border-transparent bg-(--theme-surface) shadow-none"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-(--theme-ring) to-transparent opacity-70" />
      <div className="pointer-events-none absolute -left-16 top-10 -z-10 h-44 w-44 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse [--pulse-opacity-max:0.34] [--pulse-opacity-min:0.12] animation-duration-[3.4s] dark:border-(--theme-ring)" />
      <div className="pointer-events-none absolute left-10 bottom-24 -z-10 h-24 w-24 rounded-full border border-(--theme-chip-border) bg-(--theme-surface-strong) animate-soft-pulse [--pulse-opacity-max:0.32] [--pulse-opacity-min:0.1] [animation-delay:0.8s] animation-duration-[3.6s] dark:border-(--theme-chip-border)" />
      <div className="pointer-events-none absolute right-8 top-24 -z-10 h-32 w-32 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse [--pulse-opacity-max:0.28] [--pulse-opacity-min:0.09] [animation-delay:1.2s] animation-duration-[3.5s] dark:border-(--theme-ring)" />
      <div className="pointer-events-none absolute left-[44%] top-4 -z-10 h-12 w-12 rotate-45 rounded-md border border-(--theme-chip-border) bg-(--theme-surface-muted) animate-soft-pulse [--pulse-opacity-max:0.32] [--pulse-opacity-min:0.1] [animation-delay:0.4s] animation-duration-[3.3s] dark:border-(--theme-chip-border)" />
      <div className="pointer-events-none absolute right-[18%] bottom-8 -z-10 h-14 w-14 rotate-12 rounded-lg border border-(--theme-chip-border) bg-(--theme-surface-muted) animate-soft-pulse [--pulse-opacity-max:0.28] [--pulse-opacity-min:0.09] [animation-delay:1.6s] animation-duration-[3.7s] dark:border-(--theme-chip-border)" />
      <div className="pointer-events-none absolute left-[26%] top-32 -z-10 h-10 w-28 -rotate-12 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse [--pulse-opacity-max:0.26] [--pulse-opacity-min:0.08] [animation-delay:1s] animation-duration-[3.5s] dark:border-(--theme-ring)" />
      <div className="pointer-events-none absolute right-[34%] top-10 -z-10 h-16 w-16 rounded-full border border-(--theme-chip-border) bg-(--theme-surface-strong) animate-soft-pulse [--pulse-opacity-max:0.26] [--pulse-opacity-min:0.08] [animation-delay:2s] animation-duration-[3.6s] dark:border-(--theme-chip-border)" />
      <div className="pointer-events-none absolute left-[54%] bottom-16 -z-10 h-9 w-24 rotate-45 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse [--pulse-opacity-max:0.24] [--pulse-opacity-min:0.08] [animation-delay:0.2s] animation-duration-[3.4s] dark:border-(--theme-ring)" />
      <div className="pointer-events-none absolute right-[48%] bottom-6 -z-10 h-20 w-20 rounded-full border border-(--theme-chip-border) bg-(--theme-surface-strong) animate-soft-pulse [--pulse-opacity-max:0.22] [--pulse-opacity-min:0.07] [animation-delay:1.3s] animation-duration-[3.8s] dark:border-(--theme-chip-border)" />
      <div className="pointer-events-none absolute -right-20 bottom-20 -z-10 h-56 w-56 rounded-full bg-(--theme-glow) blur-3xl animate-soft-pulse [animation-delay:1s] [--pulse-opacity-max:0.36] [--pulse-opacity-min:0.13] animation-duration-[3.6s]" />
      <div className="pointer-events-none absolute left-[8%] top-[46%] -z-10 h-28 w-28 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse [--pulse-opacity-max:0.24] [--pulse-opacity-min:0.08] [animation-delay:2.2s] animation-duration-[3.9s] dark:border-(--theme-ring)" />
      <div className="pointer-events-none absolute right-[10%] top-[58%] -z-10 h-12 w-36 -rotate-12 rounded-full border border-(--theme-chip-border) bg-(--theme-surface-muted) animate-soft-pulse [--pulse-opacity-max:0.26] [--pulse-opacity-min:0.08] [animation-delay:0.9s] animation-duration-[3.7s] dark:border-(--theme-chip-border)" />
      <div className="pointer-events-none absolute left-[34%] top-[72%] -z-10 h-16 w-16 rotate-45 rounded-xl border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse [--pulse-opacity-max:0.22] [--pulse-opacity-min:0.07] [animation-delay:1.7s] animation-duration-[3.8s] dark:border-(--theme-ring)" />
      <div className="pointer-events-none absolute right-[28%] bottom-[18%] -z-10 h-24 w-24 rounded-full border border-(--theme-chip-border) bg-(--theme-surface-strong) animate-soft-pulse [--pulse-opacity-max:0.22] [--pulse-opacity-min:0.07] [animation-delay:2.5s] animation-duration-[4s] dark:border-(--theme-chip-border)" />
      {!canEdit && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          Modo visualização habilitado.
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5">
          <PersonagemHeader
            nome={personagem.nome}
            classe={personagem.classe_nome}
            raca={personagem.raca_nome}
            urlImagem={personagem.imagem_pixel || personagem.url_imagem}
          />

          <PersonagemBarras
            personagem={personagem}
            setPersonagem={setPersonagem}
            canEdit={canEdit}
          />

          <div className="flex flex-col gap-5 lg:hidden">{fichaOverview}</div>

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

            {visibleSections.rolagem ? (
              <SectionTransition key="rolagem">
                <PersonagemPainelRolagem canEdit={canEdit} />
              </SectionTransition>
            ) : null}

            {visibleSections.anotacoes ? (
              <SectionTransition key="anotacoes">
                <PersonagemAnotacoes
                  personagem={personagem}
                  setPersonagem={setPersonagem}
                  canEdit={canEdit}
                />
              </SectionTransition>
            ) : null}
          </AnimatePresence>
        </aside>

        <section className="min-w-0 flex flex-col gap-5">
          <div className="hidden lg:flex lg:flex-col lg:gap-5">{fichaOverview}</div>

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
                <PersonagemPericias pericias={personagem.pericias ?? []} canEdit={canEdit} />
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
            !visibleSections.anotacoes &&
            !visibleSections.defesa &&
            !visibleSections.rolagem &&
            !(hasActions && visibleSections.acoes) ? (
              <SectionTransition key="empty-state">
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-5 text-sm text-muted-foreground">
                  Todas as seções estão ocultas no momento. Use os botões acima
                  para reabrir a ficha.
                </div>
              </SectionTransition>
            ) : null}
          </AnimatePresence>
        </section>
      </div>
    </Card>
  );
}
