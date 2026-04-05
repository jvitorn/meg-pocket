"use client";

import Link from "next/link";
import Image from "next/image";
import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Search } from "lucide-react";

import type { RacaInterface } from "@/types";
import { cn } from "@/lib/utils";
import { getRacaTheme } from "@/lib/fantasyThemes";

type Item = Pick<
  RacaInterface,
  | "id"
  | "nome"
  | "descricao"
  | "hp"
  | "mana"
  | "img"
  | "icone"
  | "corTema"
  | "habilidadeDiariaNome"
  | "habilidadeDiariaCombate"
  | "habilidadeDiariaForaDeCombate"
>;

export default function RacaListClient({ initialItems }: { initialItems: Item[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const filtered = useMemo(() => {
    const q = normalizeText(deferredQuery.trim());
    if (!q) return initialItems;

    return initialItems.filter((item) => {
      const haystack = [
        item.nome,
        item.descricao ?? "",
        item.habilidadeDiariaCombate ?? "",
        item.habilidadeDiariaForaDeCombate ?? "",
        item.habilidadeDiariaNome ?? "",
        item.icone ?? "",
        item.corTema ?? "",
        `hp ${item.hp ?? 0}`,
        `mana ${item.mana ?? 0}`,
      ]
        .join(" ");

      return normalizeText(haystack).includes(q);
    });
  }, [initialItems, deferredQuery]);

  return (
    <section>
      <header className="mb-8 rounded-4xl border border-border/70 bg-card/80 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Bestiário de linhagens
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.12em] text-foreground md:text-5xl">
              Raças
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              Escolha uma raça para ver descrição, atributos e a habilidade diária em combate e fora dele.
            </p>
          </div>

          <div className="relative w-full lg:w-[24rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Buscar raças"
              placeholder="Buscar por nome ou habilidade..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-border/70 bg-background/70 py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
      >
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border/70 bg-card/70 p-6 text-sm text-muted-foreground">
            Nenhuma raça encontrada.
          </div>
        ) : (
          filtered.map((raca) => {
            const theme = getRacaTheme(raca);
            const Icon = theme.icon;

            return (
              <motion.article
                key={raca.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={theme.style}
                className={cn(
                  "group relative overflow-hidden rounded-[1.75rem] border bg-linear-to-b p-4 shadow-sm transition",
                  theme.softClass,
                  theme.frameClass
                )}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
                <Link href={`/raca/${raca.id}`} className="block">
                  <div className="flex items-start gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                      {raca.img && (
                        <Image src={raca.img} alt={raca.nome} fill unoptimized className="object-cover" />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/35 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className={cn("h-8 w-8", theme.iconClass)} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="truncate text-lg font-semibold text-foreground">
                            {raca.nome}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {raca.descricao ?? "Sem descrição disponível."}
                          </p>
                        </div>
                        <div className={cn("rounded-full border p-2", theme.chipClass)}>
                          <Sparkles className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", theme.chipClass)}>
                          HP {raca.hp ?? 0}
                        </span>
                        <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", theme.chipClass)}>
                          Mana {raca.mana ?? 0}
                        </span>
                        {raca.corTema && (
                          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                            {raca.corTema}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">
                        Habilidade diária
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white/90">
                        {raca.habilidadeDiariaNome ?? "Talento racial"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">
                        Combate
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/86">
                        {raca.habilidadeDiariaCombate ?? "Sem habilidade de combate cadastrada."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">
                        Fora de combate
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/86">
                        {raca.habilidadeDiariaForaDeCombate ?? "Sem habilidade fora de combate cadastrada."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-white/68">
                    <span>{raca.icone ?? "sem ícone"}</span>
                    <span className="inline-flex items-center gap-1 opacity-80 transition group-hover:opacity-100">
                      Ver detalhes
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.article>
            );
          })
        )}
      </motion.div>
    </section>
  );
}
