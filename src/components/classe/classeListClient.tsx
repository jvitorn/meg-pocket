"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search, Shield } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ColorThemeName } from "@/lib/utils";
import { getClasseTheme, getLegendInitials } from "@/lib/fantasyThemes";

type Item = {
  id: number;
  slug?: string | null;
  nome: string;
  icone?: string | null;
  corTema?: ColorThemeName | null;
  subtitulo?: string | null;
  img_corpo?: string | null;
  background?: string | null;
  tags?: string[];
  hp?: number | null;
  mana?: number | null;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ClassesListClient({ initialItems }: { initialItems: Item[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<"id" | "nome">("id");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    initialItems.forEach((item) => (item.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [initialItems]);

  const filtered = useMemo(() => {
    const q = normalizeText(deferredQuery.trim());
    let items = initialItems.slice();

    if (activeTag) {
      items = items.filter((item) => Array.isArray(item.tags) && item.tags.includes(activeTag));
    }

    if (q.length > 0) {
      items = items.filter((item) => {
        const text = [
          item.nome,
          item.subtitulo ?? "",
          (item.tags ?? []).join(" "),
          `hp ${item.hp ?? 0}`,
          `mana ${item.mana ?? 0}`,
        ].join(" ");
        return normalizeText(text).includes(q);
      });
    }

    items.sort((a, b) => (sort === "nome" ? a.nome.localeCompare(b.nome) : a.id - b.id));
    return items;
  }, [initialItems, deferredQuery, activeTag, sort]);

  return (
    <section>
      <header className="mb-6 rounded-[1.6rem] border border-border/70 bg-card/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Arsenal de arquétipos
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-foreground md:text-4xl">
              Classes
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Escolha uma classe para ver detalhes, personagens relacionados e grimório.
            </p>
          </div>

          <div className="relative w-full lg:w-[24rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Buscar classes"
              placeholder="Buscar por nome, tag, HP ou Mana..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-border/70 bg-background/70 py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              activeTag === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background/60 text-muted-foreground"
            )}
          >
            Todas
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                activeTag === tag
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background/60 text-muted-foreground"
              )}
            >
              {tag}
            </button>
          ))}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "id" | "nome")}
            aria-label="Ordenar"
            className="ml-auto rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground"
          >
            <option value="id">Ordem padrão</option>
            <option value="nome">Nome</option>
          </select>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        role="list"
        aria-label="Lista de classes"
      >
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border/70 bg-card/70 p-6 text-sm text-muted-foreground">
            Nenhuma classe encontrada para essa busca.
          </div>
        ) : (
          filtered.map((classe) => {
            const theme = getClasseTheme(classe);
            const Icon = theme.icon;
            const initials = getLegendInitials(classe.nome);

            return (
              <motion.article
                key={classe.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={theme.style}
                role="listitem"
                className="rounded-2xl border border-border/70 bg-card/80 p-4 transition hover:border-primary/35"
              >
                <Link href={`/classe/${classe.id}`} className="block">
                  <div className="flex items-start gap-3">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className={cn("h-7 w-7", theme.iconClass)} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-lg font-semibold text-foreground">{classe.nome}</h3>
                        <Shield className="mt-1 h-4 w-4 text-muted-foreground" />
                      </div>
                      {classe.subtitulo ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {classe.subtitulo}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(classe.tags ?? []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", theme.chipClass)}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">HP</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{classe.hp ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Mana</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{classe.mana ?? 0}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      Abrir classe
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
