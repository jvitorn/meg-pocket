"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DashboardPersonagemCard } from "@/components/dashboard-personagem-card";

export type DashboardPersonagemGridItem = {
  id: number;
  nome: string;
  detalhe: string;
  imageSrc: string;
  createdAtLabel: string;
  updatedAtLabel: string;
  campanhaNome: string;
  classeNome: string;
  racaNome: string;
  elemento: string;
  hpAtual: number | null;
  hpMax: number;
  manaAtual: number | null;
  manaMax: number;
  defesaAtual: number;
  defesaMax: number;
};

type Props = {
  personagens: DashboardPersonagemGridItem[];
};

export function DashboardPersonagensGrid({ personagens }: Props) {
  const [search, setSearch] = useState("");
  const [campaign, setCampaign] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "campaign">(
    "updated"
  );

  const campanhas = useMemo(
    () =>
      Array.from(new Set(personagens.map((personagem) => personagem.campanhaNome)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [personagens]
  );

  const filteredPersonagens = useMemo(() => {
    const query = search.trim().toLowerCase();

    return personagens
      .filter((personagem) => {
        const matchesCampaign =
          campaign === "all" || personagem.campanhaNome === campaign;
        const matchesSearch =
          !query ||
          [
            personagem.nome,
            personagem.campanhaNome,
            personagem.classeNome,
            personagem.racaNome,
            personagem.elemento,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        return matchesCampaign && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.nome.localeCompare(b.nome, "pt-BR");
        }

        if (sortBy === "campaign") {
          return (
            a.campanhaNome.localeCompare(b.campanhaNome, "pt-BR") ||
            a.nome.localeCompare(b.nome, "pt-BR")
          );
        }

        return 0;
      });
  }, [campaign, personagens, search, sortBy]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-lg border bg-card/60 p-3 md:grid-cols-[1fr_220px_180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ficha, campanha, classe..."
            className="pl-9"
          />
        </label>

        <select
          value={campaign}
          onChange={(event) => setCampaign(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Filtrar por campanha"
        >
          <option value="all">Todas as campanhas</option>
          {campanhas.map((campanha) => (
            <option key={campanha} value={campanha}>
              {campanha}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) =>
            setSortBy(event.target.value as "updated" | "name" | "campaign")
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Ordenar fichas"
        >
          <option value="updated">Recentes</option>
          <option value="name">Nome</option>
          <option value="campaign">Campanha</option>
        </select>
      </div>

      {filteredPersonagens.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredPersonagens.map((personagem) => (
            <DashboardPersonagemCard key={personagem.id} {...personagem} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card/40 px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">Nenhuma ficha encontrada</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajuste a busca ou o filtro de campanha para ver outros personagens.
          </p>
        </div>
      )}
    </div>
  );
}
