"use client";

import Link from "next/link";
import { Plus, Sparkles, UserRoundPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CampanhaSectionHeader } from "@/components/campanhas/campanha-section-header";
import type {
  CampaignNpcItem,
  NpcEstiloNarrativoOption,
} from "@/types/campanha";

export type { CampaignNpcItem as CampanhaNpcItem, NpcEstiloNarrativoOption };

type CatalogOption = {
  id: number;
  nome: string;
};

type Props = {
  campanhaId: number;
  npcs?: CampaignNpcItem[];
  racas?: CatalogOption[];
  classes?: CatalogOption[];
  estilosNarrativos?: NpcEstiloNarrativoOption[];
  limite?: number;
};

export function CampanhaNpcsSection({
  campanhaId,
  npcs = [],
  limite = 50,
}: Props) {
  const remainingSlots = Math.max(limite - npcs.length, 0);
  const featuredNpcs = npcs.slice(0, 6);

  return (
    <section
      id="npcs"
      className="scroll-mt-24 overflow-hidden rounded-lg border bg-card/70"
    >
      <CampanhaSectionHeader
        icon={UserRoundPlus}
        eyebrow="Elenco"
        title="NPCs da campanha"
        tone="emerald"
        meta={
          <>
            {npcs.length}/{limite} salvos · {remainingSlots}{" "}
            {remainingSlots === 1 ? "vaga" : "vagas"}
          </>
        }
        actions={
          <Button asChild className="gap-2 bg-white text-zinc-950 hover:bg-white/90">
            <Link href={`/campanhas/escudo/${campanhaId}/npcs`}>
              <Sparkles className="h-4 w-4" />
              Abrir NPCs
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {featuredNpcs.map((npc) => (
          <Link
            key={npc.id}
            href={`/campanhas/escudo/${campanhaId}/npcs?npc=${npc.id}`}
            className="group relative overflow-hidden rounded-lg border bg-background/80 p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
          >
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 via-transparent to-indigo-500/10 opacity-70 transition group-hover:opacity-100" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-card shadow-sm">
                <UserRoundPlus className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{npc.nome}</h3>
                <p className="truncate text-xs text-muted-foreground">
                  {npc.racaNome}
                  {npc.profissao ? ` · ${npc.profissao}` : ""}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {npcs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            Nenhum NPC salvo ainda. Abra a tela de NPCs para criar manualmente ou gerar proceduralmente.
          </div>
        ) : null}

        {npcs.length > featuredNpcs.length ? (
          <Link
            href={`/campanhas/escudo/${campanhaId}/npcs`}
            className="flex min-h-20 items-center justify-center rounded-lg border border-dashed text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
          >
            Ver todos os {npcs.length} NPCs
          </Link>
        ) : null}

        {npcs.length > 0 && remainingSlots > 0 ? (
          <Link
            href={`/campanhas/escudo/${campanhaId}/npcs`}
            className="flex min-h-20 items-center justify-center gap-2 rounded-lg border border-dashed text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Novo NPC
          </Link>
        ) : null}
      </div>
    </section>
  );
}
