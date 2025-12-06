// src/components/classe/classesListClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Sparkles, HelpCircle } from "lucide-react";

import LogoGuerreiro from "@/components/icons/guerreiro";
import LogoElementalista from "@/components/icons/elementalista";
import LogoPurificador from "@/components/icons/purificador";
import LogoArtifice from "@/components/icons/artifice";

type Item = {
  id: number;
  slug?: string | null;
  nome: string;
  subtitulo?: string | null;
  img_corpo?: string | null;
  background?: string | null;
  tags?: string[];
};

export default function ClassesListClient({ initialItems }: { initialItems: Item[] }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<"id" | "nome">("id");

  const allTags = useMemo(() => {
    const s = new Set<string>();
    initialItems.forEach((it) => (it.tags || []).forEach((t) => s.add(t)));
    return Array.from(s);
  }, [initialItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = initialItems.slice();

    if (activeTag) {
      arr = arr.filter((i) => Array.isArray(i.tags) && i.tags.includes(activeTag));
    }

    if (q.length > 0) {
      arr = arr.filter(
        (i) =>
          i.nome.toLowerCase().includes(q) ||
          (i.subtitulo ?? "").toLowerCase().includes(q) ||
          (i.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sort === "nome") {
      arr.sort((a, b) => a.nome.localeCompare(b.nome));
    } else {
      arr.sort((a, b) => a.id - b.id);
    }

    return arr;
  }, [initialItems, query, activeTag, sort]);

  function IconByKey(key?: string | null, className = "w-12 h-12") {
    const k = (key ?? "").toLowerCase();
    if (k.includes("guerrei")) return <LogoGuerreiro className={`${className} text-red-600`} />;
    if (k.includes("element")) return <LogoElementalista className={`${className} text-blue-600`} />;
    if (k.includes("purific")) return <LogoPurificador className={`${className} text-emerald-600`} />;
    if (k.includes("artifice")) return <LogoArtifice className={`${className} text-amber-600`} />;
    if (k.includes("unico")) return <HelpCircle className={`${className} text-gray-500`} />;
    return <HelpCircle className={`${className} text-gray-400`} />;
  }

  return (
    <section>
      <header className="mb-6">
        {/* <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"> */}
        <div className="flex flex-col gap-4">
          <div className="flex w-full lg:w-auto items-stretch gap-3">
            <div className="flex-1 min-w-0">
              <input
                type="search"
                aria-label="Buscar classes"
                placeholder="Buscar por nome, subtítulo ou tag..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 bg-background/60 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "id" | "nome")}
                aria-label="Ordenar"
                className="rounded-md border border-border px-3 py-2 bg-background/60"
              >
                <option value="id">Ordem padrão</option>
                <option value="nome">Ordenar por nome</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tag chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 rounded-full text-xs border ${activeTag === null ? "bg-primary text-white border-primary" : "bg-background/40"}`}
          >
            Todas
          </button>

          {allTags.length === 0 ? (
            <span className="text-xs text-muted-foreground">Sem tags</span>
          ) : (
            allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTag((prev) => (prev === t ? null : t))}
                aria-pressed={activeTag === t}
                className={`px-3 py-1 rounded-full text-xs border ${activeTag === t ? "bg-primary text-white border-primary" : "bg-background/40"}`}
              >
                {t}
              </button>
            ))
          )}
        </div>
      </header>

      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        role="list"
        aria-label="Lista de classes"
      >
        {filtered.length === 0 ? (
          <div className="col-span-full text-sm text-muted-foreground">Nenhuma classe encontrada.</div>
        ) : (
          filtered.map((c) => {
            const isUnico = (c.slug ?? "").toLowerCase() === "unico" || c.nome.toLowerCase() === "unico";

            return (
              <motion.div key={c.id} layout whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.995 }} role="listitem">
                <Link href={`/classe/${c.id}`} className="block">
                  <Card
                    className={`p-4 transition-shadow duration-150 cursor-pointer flex gap-4 items-start ${
                      isUnico
                        ? "opacity-95 border border-gray-300/40 bg-gray-50 dark:bg-slate-800 dark:border-gray-700"
                        : "hover:shadow-lg bg-white/80 dark:bg-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-none rounded-lg w-16 h-16 flex items-center justify-center bg-white/5 dark:bg-white/3">
                        {IconByKey(c.slug ?? c.nome, "w-12 h-12")}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-lg truncate ${isUnico ? "text-gray-700 dark:text-gray-300" : ""}`}>
                          {c.nome}
                        </h3>
                        {c.subtitulo && <div className="text-xs text-muted-foreground mt-1 truncate">{c.subtitulo}</div>}

                        <div className="flex flex-wrap gap-2 mt-3">
                          {(c.tags ?? []).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className={`px-2 py-0.5 text-xs rounded-full border ${
                                isUnico ? "bg-gray-200 border-gray-400 text-gray-700 dark:bg-slate-700" : "bg-gray-100 border-gray-200 dark:bg-slate-800 dark:border-gray-700"
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </section>
  );
}
