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
import {
  PersonagemSectionId,
  PersonagemSectionNav,
} from "./ficha/PersonagemSectionNav";

type ElementType = "natureza" | "agua" | "fogo" | "vento";

const elements = {
  natureza: { icon: Leaf, bgColor: "bg-green-500", color: "text-green-900" },
  agua: { icon: Droplet, bgColor: "bg-blue-500", color: "text-blue-900" },
  fogo: { icon: Flame, bgColor: "bg-red-500", color: "text-red-900" },
  vento: { icon: Wind, bgColor: "bg-gray-300", color: "text-gray-700" },
};

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
  const navItems: ReadonlyArray<{
    id: PersonagemSectionId;
    label: string;
    count: number | null;
    isVisible: boolean;
  }> = [
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

  return (
    <Card className="overflow-hidden shadow-lg p-4 md:p-6 bg-background border border-border">
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
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80">
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

          <PersonagemSectionNav
            items={navItems}
            onNavigate={navigateToSection}
            onToggle={toggleSection}
          />

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
