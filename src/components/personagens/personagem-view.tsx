"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Card } from "@/components/ui/card";
import { Leaf, Droplet, Flame, Wind } from "lucide-react";
import { PersonagemInterface } from "@/types";
import { PersonagemHeader } from "./ficha/PersonagemHeader";
import { PersonagemBarras } from "./ficha/PersonagemBarras";
import { PersonagemSlotsDefensivos } from "./ficha/PersonagemSlotsDefensivos";
import { PersonagemSobre } from "./ficha/PersonagemSobre";
import { PersonagemPericias } from "./ficha/PersonagemPericias";
import { PersonagemMagias } from "./ficha/PersonagemMagias";

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

export function PersonagemView({
  personagem,
  setPersonagem,
  canEdit,
  extraSection,
}: Props) {
  const elemento = (["natureza", "agua", "fogo", "vento"].includes(
    personagem.elemento as ElementType
  )
    ? personagem.elemento
    : "natureza") as ElementType;

  const ElementIcon = elements[elemento].icon;

  return (
    <Card className="overflow-hidden shadow-lg p-4 md:p-6 bg-background border border-border">
      {!canEdit && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Modo visualização habilitado.
        </div>
      )}

      <div className="md:grid md:grid-cols-[280px_1fr] gap-6">
        <aside className="flex flex-col gap-6 md:sticky md:top-20">
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

          <PersonagemSlotsDefensivos
            personagemId={personagem.id}
            slots={personagem.slotsDefensivos}
            pericias={personagem.pericias}
            setPersonagem={setPersonagem}
            canEdit={canEdit}
          />
        </aside>

        <section className="flex flex-col gap-6">
          <div>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Elemento
            </h3>

            <div
              className={`mt-2 p-3 rounded-md flex items-center gap-3 ${elements[elemento].bgColor} ${elements[elemento].color}`}
            >
              <ElementIcon className="w-5 h-5" />
              <span className="font-semibold capitalize">{elemento}</span>
            </div>
          </div>

          <PersonagemSobre
            personagem={personagem}
            setPersonagem={setPersonagem}
            canEdit={canEdit}
          />

          <PersonagemPericias pericias={personagem.pericias ?? []} />

          <PersonagemMagias
            personagem={personagem}
            setPersonagem={setPersonagem}
            canEdit={canEdit}
          />

          {extraSection}
        </section>
      </div>
    </Card>
  );
}
