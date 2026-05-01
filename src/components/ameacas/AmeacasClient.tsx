"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  Dices,
  FilterX,
  Grid2X2,
  HeartPulse,
  List,
  Search,
  Shield,
  X,
  Zap,
} from "lucide-react";

import type { Ameaca, AmeacaElemento, AmeacaTipo } from "@/data/dataBestiario";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatAmeacaList,
  getElementoAmeacaConfig,
  getTipoAmeacaConfig,
  normalizeAmeacaSearch,
} from "@/components/ameacas/ameaca-theme";

type ViewMode = "cards" | "lista";
type SortMode = "nome" | "va-asc" | "va-desc";

const PAGE_SIZE = 6;
const QUICK_SEARCHES = [
  { label: "Boss", query: "boss" },
  { label: "Lacaios", query: "lacaio" },
  { label: "Místicos", query: "místico" },
  { label: "Controle", query: "controlador" },
  { label: "Tanques", query: "tanque" },
  { label: "Aéreas", query: "aérea" },
] as const;

export function AmeacasClient({ ameacas }: { ameacas: Ameaca[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [tipo, setTipo] = useState<AmeacaTipo | "todos">("todos");
  const [elemento, setElemento] = useState<AmeacaElemento | "todos">("todos");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [sortMode, setSortMode] = useState<SortMode>("va-asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const tipos = useMemo(
    () => Array.from(new Set(ameacas.map((ameaca) => ameaca.tipo))).sort(),
    [ameacas]
  );
  const elementos = useMemo(
    () => Array.from(new Set(ameacas.map((ameaca) => ameaca.elemento))).sort(),
    [ameacas]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeAmeacaSearch(deferredQuery.trim());

    return ameacas
      .filter((ameaca) => {
        if (tipo !== "todos" && ameaca.tipo !== tipo) return false;
        if (elemento !== "todos" && ameaca.elemento !== elemento) return false;
        if (!normalizedQuery) return true;

        const haystack = [
          ameaca.nome,
          ameaca.tipo,
          ameaca.tipoSecundario ?? "",
          ameaca.elemento,
          ameaca.funcao,
          ameaca.descricao,
          ameaca.narrativa,
          ameaca.fraquezas.join(" "),
          ameaca.resistencias.join(" "),
          ameaca.imunidades.join(" "),
          ameaca.golpes.map((golpe) => golpe.nome).join(" "),
        ].join(" ");

        return normalizeAmeacaSearch(haystack).includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortMode === "nome") return a.nome.localeCompare(b.nome);
        if (sortMode === "va-desc") return b.va - a.va || a.nome.localeCompare(b.nome);
        return a.va - b.va || a.nome.localeCompare(b.nome);
      });
  }, [ameacas, deferredQuery, elemento, sortMode, tipo]);

  const visible = filtered.slice(0, visibleCount);
  const hasActiveFilters =
    query.trim().length > 0 || tipo !== "todos" || elemento !== "todos";

  function clearFilters() {
    setQuery("");
    setTipo("todos");
    setElemento("todos");
    setVisibleCount(PAGE_SIZE);
  }

  function applyQuickSearch(searchQuery: string) {
    setQuery((current) => (current.trim() === searchQuery ? "" : searchQuery));
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 rounded-lg border border-border/70 bg-card/88 p-4 shadow-sm backdrop-blur">
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                aria-label="Buscar ameaças"
                placeholder="Buscar por nome, função, golpe ou fraqueza..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="h-10 w-full rounded-md border border-border/80 bg-background/80 pl-10 pr-10 text-sm outline-none transition placeholder:text-muted-foreground focus:border-red-400 focus:ring-2 focus:ring-red-500/15"
              />
              {query.trim().length > 0 ? (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => {
                    setQuery("");
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>

            <select
              value={elemento}
              onChange={(event) => {
                setElemento(event.target.value as AmeacaElemento | "todos");
                setVisibleCount(PAGE_SIZE);
              }}
              aria-label="Filtrar por elemento"
              className="hidden h-10 rounded-md border border-border/80 bg-background/80 px-3 text-sm text-foreground outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 md:block"
            >
              <option value="todos">Todos os elementos</option>
              {elementos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={sortMode}
              onChange={(event) => {
                setSortMode(event.target.value as SortMode);
                setVisibleCount(PAGE_SIZE);
              }}
              aria-label="Ordenar ameaças"
              className="hidden h-10 rounded-md border border-border/80 bg-background/80 px-3 text-sm text-foreground outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 md:block"
            >
              <option value="va-asc">VA crescente</option>
              <option value="va-desc">VA decrescente</option>
              <option value="nome">Nome</option>
            </select>
          </div>

          <details className="group mt-3 min-w-0 rounded-md border border-border/70 bg-background/70 md:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium text-foreground marker:hidden">
              Filtros rápidos
              <span className="text-xs text-muted-foreground group-open:hidden">
                {tipo === "todos" && elemento === "todos" ? "Todos" : "Ativos"}
              </span>
              <span className="hidden text-xs text-muted-foreground group-open:inline">
                Recolher
              </span>
            </summary>
            <div className="grid gap-3 border-t border-border/70 p-3">
              <select
                value={elemento}
                onChange={(event) => {
                  setElemento(event.target.value as AmeacaElemento | "todos");
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-label="Filtrar por elemento no mobile"
                className="h-10 rounded-md border border-border/80 bg-background px-3 text-sm text-foreground outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15"
              >
                <option value="todos">Todos os elementos</option>
                {elementos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={sortMode}
                onChange={(event) => {
                  setSortMode(event.target.value as SortMode);
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-label="Ordenar ameaças no mobile"
                className="h-10 rounded-md border border-border/80 bg-background px-3 text-sm text-foreground outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15"
              >
                <option value="va-asc">VA crescente</option>
                <option value="va-desc">VA decrescente</option>
                <option value="nome">Nome</option>
              </select>

              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={tipo === "todos"}
                  onClick={() => {
                    setTipo("todos");
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  Todas
                </FilterButton>
                {tipos.map((item) => {
                  const config = getTipoAmeacaConfig(item);
                  const Icon = config.icon;

                  return (
                    <FilterButton
                      key={item}
                      active={tipo === item}
                      onClick={() => {
                        setTipo((current) => (current === item ? "todos" : item));
                        setVisibleCount(PAGE_SIZE);
                      }}
                      className={tipo === item ? config.chipClass : undefined}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item}
                    </FilterButton>
                  );
                })}
              </div>
            </div>
          </details>

          <div className="mt-4 hidden flex-wrap gap-2 md:flex">
            <FilterButton
              active={tipo === "todos"}
              onClick={() => {
                setTipo("todos");
                setVisibleCount(PAGE_SIZE);
              }}
            >
              Todas
            </FilterButton>
            {tipos.map((item) => {
              const config = getTipoAmeacaConfig(item);
              const Icon = config.icon;

              return (
                <FilterButton
                  key={item}
                  active={tipo === item}
                  onClick={() => {
                    setTipo((current) => (current === item ? "todos" : item));
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={tipo === item ? config.chipClass : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item}
                </FilterButton>
              );
            })}
          </div>

          <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Mostrando{" "}
              <span className="font-semibold text-foreground">{visible.length}</span>{" "}
              de <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              ameaças
            </p>

            <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0">
              {QUICK_SEARCHES.map((item) => {
                const isActive =
                  normalizeAmeacaSearch(query.trim()) ===
                  normalizeAmeacaSearch(item.query);

                return (
                  <button
                    key={item.query}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => applyQuickSearch(item.query)}
                    className={cn(
                      "shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
                      isActive
                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
                        : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-border/70 bg-card/88 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Resultado
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {filtered.length}
              </p>
            </div>

            <div className="inline-flex rounded-md border border-border/80 bg-background/80 p-1">
              <ViewButton
                label="Cards"
                active={viewMode === "cards"}
                onClick={() => {
                  setViewMode("cards");
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                <Grid2X2 className="h-4 w-4" />
              </ViewButton>
              <ViewButton
                label="Lista"
                active={viewMode === "lista"}
                onClick={() => {
                  setViewMode("lista");
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                <List className="h-4 w-4" />
              </ViewButton>
            </div>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 w-full justify-center"
              onClick={clearFilters}
            >
              <FilterX className="h-4 w-4" />
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-card/70 p-6 text-sm text-muted-foreground">
            Nenhuma ameaça encontrada.
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((ameaca) => (
              <AmeacaCard key={ameaca.id} ameaca={ameaca} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:block md:overflow-hidden md:rounded-lg md:border md:border-border/70 md:bg-card/80">
            {visible.map((ameaca, index) => (
              <AmeacaRow
                key={ameaca.id}
                ameaca={ameaca}
                className={index > 0 ? "md:border-t md:border-border/70" : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {visibleCount < filtered.length ? (
        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
          >
            Ver mais
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function FilterButton({
  active,
  className,
  children,
  onClick,
}: {
  active: boolean;
  className?: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition",
        active
          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
          : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function ViewButton({
  label,
  active,
  children,
  onClick,
}: {
  label: string;
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition",
        active
          ? "bg-red-600 text-white shadow-sm dark:bg-red-500"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function AmeacaCard({ ameaca }: { ameaca: Ameaca }) {
  const tipoConfig = getTipoAmeacaConfig(ameaca.tipo);
  const elementoConfig = getElementoAmeacaConfig(ameaca.elemento);
  const TipoIcon = tipoConfig.icon;
  const ElementoIcon = elementoConfig.icon;

  return (
    <Link
      href={`/ameacas/${ameaca.id}`}
      aria-label={`Ver detalhes de ${ameaca.nome}`}
      className="group relative flex h-full min-h-[27rem] flex-col overflow-hidden rounded-lg border border-border/70 bg-card/88 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35 dark:hover:border-red-500/40"
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", tipoConfig.surfaceClass)} />
      <div className="flex min-h-[6.25rem] items-start gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-md border",
            tipoConfig.surfaceClass
          )}
        >
          <TipoIcon className={cn("h-6 w-6", tipoConfig.iconClass)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold", tipoConfig.chipClass)}>
              {ameaca.tipo}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold", elementoConfig.chipClass)}>
              <ElementoIcon className="h-3 w-3" />
              {ameaca.elemento}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            {ameaca.nome}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{ameaca.funcao}</p>
        </div>
      </div>

      <p className="mt-4 min-h-[4.5rem] line-clamp-3 text-sm leading-6 text-foreground/78">
        {ameaca.descricao}
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2 border-y border-border/70 py-3 text-center">
        <StatChip icon={<Zap className="h-3.5 w-3.5" />} label="VA" value={ameaca.va} />
        <StatChip icon={<HeartPulse className="h-3.5 w-3.5" />} label="PV" value={ameaca.pv} />
        <StatChip icon={<Dices className="h-3.5 w-3.5" />} label="Dano" value={ameaca.danoBase} />
        <StatChip icon={<Shield className="h-3.5 w-3.5" />} label="DEF" value={ameaca.defesa} />
      </div>

      <div className="mt-4 grid min-h-[3.75rem] content-start gap-2 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground/80">Fraquezas:</span>{" "}
          {formatAmeacaList(ameaca.fraquezas)}
        </p>
        <p>
          <span className="font-semibold text-foreground/80">Reações:</span>{" "}
          B{ameaca.reacoes.bloqueio} / E{ameaca.reacoes.esquiva} / C
          {ameaca.reacoes.contraAtaque}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 md:hidden">
        {ameaca.golpes.slice(0, 2).map((golpe) => (
          <span
            key={golpe.nome}
            className="rounded-md border border-red-200 bg-red-50/80 px-2 py-1 text-[11px] font-medium text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100"
          >
            {golpe.nome}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-5">
        <div className="inline-flex w-full items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm font-medium text-foreground transition group-hover:border-red-300 group-hover:bg-red-50 group-hover:text-red-700 dark:group-hover:border-red-500/30 dark:group-hover:bg-red-500/10 dark:group-hover:text-red-100">
          Consultar ameaça
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function AmeacaRow({ ameaca, className }: { ameaca: Ameaca; className?: string }) {
  const tipoConfig = getTipoAmeacaConfig(ameaca.tipo);
  const elementoConfig = getElementoAmeacaConfig(ameaca.elemento);
  const TipoIcon = tipoConfig.icon;
  const ElementoIcon = elementoConfig.icon;

  return (
    <Link
      href={`/ameacas/${ameaca.id}`}
      aria-label={`Ver detalhes de ${ameaca.nome}`}
      className={cn(
        "group grid gap-4 rounded-lg border border-border/70 bg-card/88 p-4 shadow-sm transition hover:bg-red-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35 dark:hover:bg-red-500/[0.06] md:grid-cols-[minmax(0,1fr)_18rem_8rem] md:items-center md:rounded-none md:border-0 md:bg-transparent md:shadow-none",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border",
            tipoConfig.surfaceClass
          )}
        >
          <TipoIcon className={cn("h-5 w-5", tipoConfig.iconClass)} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{ameaca.nome}</h2>
            <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", tipoConfig.chipClass)}>
              {ameaca.tipo}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium", elementoConfig.chipClass)}>
              <ElementoIcon className="h-3 w-3" />
              {ameaca.elemento}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {ameaca.descricao}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <InlineStat label="VA" value={ameaca.va} />
        <InlineStat label="PV" value={ameaca.pv} />
        <InlineStat label="Mana" value={ameaca.mana} />
        <InlineStat label="DEF" value={ameaca.defesa} />
      </div>

      <div className="inline-flex items-center justify-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm font-medium text-foreground transition group-hover:border-red-300 group-hover:text-red-700 dark:group-hover:border-red-500/30 dark:group-hover:text-red-100">
        Consultar
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0">
      <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-foreground">{value}</p>
    </div>
  );
}
