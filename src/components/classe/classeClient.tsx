"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Toaster } from "sonner";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, UserRound } from "lucide-react";

import { ClasseInterface, MagiaPersonagem } from "@/types";
import { MagiaDetailsDrawer } from "@/components/magia-details-drawer";
import { ClasseDetailSkeleton } from "@/components/skeletons/classe-detail.skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { MarkdownContent } from "@/components/world/markdown-content";
import { getClasseTheme, getLegendInitials } from "@/lib/fantasyThemes";
import { cn } from "@/lib/utils";
import { AttributeCard } from "@/components/attribute-card";

type ExpandableMarkdownProps = {
  title: string;
  kicker: string;
  content?: string | null;
  defaultExpanded?: boolean;
  borderClass?: string;
  kickerClass?: string;
  glowClass?: string;
};

function ExpandableMarkdown({
  title,
  kicker,
  content,
  defaultExpanded = false,
  borderClass,
  kickerClass,
  glowClass,
}: ExpandableMarkdownProps) {
  const safeContent = content?.trim() ?? "";
  const [expanded, setExpanded] = useState(defaultExpanded);
  const showToggle = safeContent.length > 360;

  return (
    <article className={cn("relative overflow-hidden rounded-4xl border bg-card/82 p-5 sm:p-6", borderClass)}>
      <div className={cn("pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl", glowClass)} />

      <div className="relative">
        <div className={cn("mb-4 h-1.5 w-20 rounded-full bg-primary/20", glowClass)} />
        <p className={cn("text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground", kickerClass)}>
          {kicker}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>

        <div className={cn("relative mt-4", !expanded && showToggle && "max-h-56 overflow-hidden")}>
          <MarkdownContent content={safeContent} />
          {!expanded && showToggle ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-card to-transparent" />
          ) : null}
        </div>

        {showToggle ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-4 rounded-full border border-border/70 px-4 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
          >
            {expanded ? "Ver menos" : "Ver mais"}
          </button>
        ) : null}
      </div>
    </article>
  );
}


export default function ClassePage() {
  const { id } = useParams<{ id: string }>();
  const [classe, setClasse] = useState<ClasseInterface | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMagia, setSelectedMagia] = useState<MagiaPersonagem | null>(null);
  const [showAllPersonagens, setShowAllPersonagens] = useState(false);
  const [personagensApi, setPersonagensApi] = useState<CarouselApi>();
  const [autoplayStopped, setAutoplayStopped] = useState(false);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/classes/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          const msg = json?.error ?? `Erro ao buscar classe (status ${res.status})`;
          throw new Error(msg);
        }

        if (mounted) setClasse(json.data as ClasseInterface);
      } catch (err) {
        console.error("Erro fetch classe:", err);
        if (mounted) setError((err as Error).message ?? "Erro desconhecido");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    setAutoplayStopped(false);
  }, [id]);

  const theme = useMemo(() => getClasseTheme(classe ?? {}), [classe]);
  const Icon = theme.icon;
  const tags = useMemo(() => (Array.isArray(classe?.tags) ? classe!.tags! : []), [classe]);
  const magias = useMemo(() => (Array.isArray(classe?.Magias) ? classe!.Magias! : []), [classe]);
  const personagens = useMemo(
    () => (Array.isArray(classe?.Personagens) ? classe!.Personagens!.slice(0, 16) : []),
    [classe]
  );
  const personagensPreview = useMemo(
    () => (showAllPersonagens ? personagens : personagens.slice(0, 8)),
    [personagens, showAllPersonagens]
  );

  const abrirMagia = useCallback((magia: MagiaPersonagem) => {
    setSelectedMagia(magia);
  }, []);

  useEffect(() => {
    if (!personagensApi) return;
    personagensApi.scrollTo(0, true);
  }, [personagensApi, showAllPersonagens]);

  useEffect(() => {
    if (!personagensApi || autoplayStopped || personagensPreview.length <= 1) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;

      if (personagensApi.canScrollNext()) {
        personagensApi.scrollNext();
        return;
      }

      personagensApi.scrollTo(0);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [autoplayStopped, personagensApi, personagensPreview.length]);

  if (loading) return <ClasseDetailSkeleton />;

  if (error) {
    return (
      <>
        <Toaster position="top-right" />
        <main className="w-full bg-background p-6 text-foreground">
          <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-center text-red-400">
            Erro: {error}
          </div>
        </main>
      </>
    );
  }

  if (!classe) {
    return (
      <>
        <Toaster position="top-right" />
        <main className="w-full bg-background p-6 text-foreground">
          <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-card/70 p-6 text-center text-muted-foreground">
            Classe não encontrada.
          </div>
        </main>
      </>
    );
  }

  const initials = getLegendInitials(classe.nome);
  const cardShellClass = cn("rounded-[2rem] border bg-card/82 p-5 sm:p-6", theme.frameClass);

  return (
    <>
      <Toaster position="top-right" />
      <main style={theme.style} className="relative overflow-hidden bg-background text-foreground">
        <section className="relative isolate overflow-hidden">
          <Image
            src={classe.background ?? "/imgs/backgrounds/classe_guerreiro.jpg"}
            alt={`${classe.nome} - plano de fundo`}
            fill
            priority
            unoptimized
            className="object-cover object-center md:object-top"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/65 to-black/35" />
          <div className={cn("absolute -left-16 top-24 h-56 w-56 rounded-full blur-3xl", theme.glowClass)} />
          <div className={cn("absolute right-0 top-16 h-72 w-72 rounded-full blur-3xl", theme.glowClass)} />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-20 mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-10 md:pt-14 lg:pt-20"
          >
            <div className="grid items-end gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="max-w-3xl">
                <div
                  className={cn(
                    "inline-flex items-center gap-3 rounded-full border bg-black/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80 backdrop-blur-md",
                    theme.frameClass
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/40",
                      theme.frameClass
                    )}
                  >
                    <Icon className={cn("h-4 w-4", theme.iconClass)} />
                  </span>
                  Classe
                </div>

                <h1 className="mt-6 text-4xl font-black uppercase tracking-[0.08em] text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                  {classe.nome}
                </h1>
                {classe.subtitulo ? (
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
                    {classe.subtitulo}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-2.5">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md",
                          theme.chipClass,
                          "bg-black/35 text-white"
                        )}
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-white/70">Sem tags cadastradas.</span>
                  )}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 }}
                className="relative mx-auto w-full max-w-104 xl:mr-0 xl:max-w-120"
              >
                <div
                  className={cn(
                    "relative w-full overflow-hidden rounded-4xl border bg-black/35 p-3 backdrop-blur-md shadow-2xl",
                    theme.frameClass
                  )}
                >
                  <div className={cn("pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full blur-3xl", theme.glowClass)} />
                  <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-black/35">
                    <div className="absolute inset-0 bg-linear-to-b from-white/8 to-transparent" />
                    {classe.img_corpo ? (
                      <div className="relative aspect-5/6 sm:aspect-4/5">
                        <Image
                          src={classe.img_corpo}
                          alt={`${classe.nome} em destaque`}
                          fill
                          unoptimized
                          className="object-contain object-center"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-5/6 flex-col items-center justify-center gap-4 text-center text-white/80 sm:aspect-4/5">
                        <div
                          className={cn(
                            "flex h-24 w-24 items-center justify-center rounded-2xl border bg-black/30 text-3xl font-black",
                            theme.frameClass
                          )}
                        >
                          {initials}
                        </div>
                        <span className="px-6 text-sm">Arte da classe ainda não cadastrada.</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3 px-2 pb-1 text-white/75">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                        Personagem de referência
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {classe.exemploPersonagem ?? "Sem exemplo de personagem"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em]",
                        theme.frameClass
                      )}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      Destaque
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto -mt-4 max-w-7xl space-y-6 px-4 pb-20 sm:px-6 lg:-mt-8">
          <ExpandableMarkdown
            title="Sobre a classe"
            kicker="Lore"
            content={classe.descricao}
            defaultExpanded
            borderClass={theme.frameClass}
            kickerClass={theme.textClass}
            glowClass={theme.glowClass}
          />

          <article className={cardShellClass}>
            <div className={cn("mb-4 h-1.5 w-20 rounded-full", theme.glowClass)} />
            <p className={cn("text-[11px] font-semibold uppercase tracking-[0.28em]", theme.textClass)}>
              Atributos de ficha
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Base da construção
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Leitura rápida dos pilares iniciais da classe para criação de ficha e equilíbrio da build.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <AttributeCard
                label="HP Base"
                value={classe.hp ?? 0}
                helper="Reserva inicial de sobrevivência da classe."
                tone="border-rose-500/30 bg-rose-500/5"
              />
              <AttributeCard
                label="Mana Base"
                value={classe.mana ?? 0}
                helper="Energia disponível para magias e habilidades."
                tone="border-blue-500/30 bg-blue-500/5"
              />
              <AttributeCard
                label="Total Base"
                value={(classe.hp ?? 0) + (classe.mana ?? 0)}
                helper="Visão geral do fôlego bruto da classe no começo."
                tone="border-emerald-500/30 bg-emerald-500/5"
              />
            </div>
          </article>

          <ExpandableMarkdown
            title="Gameplay"
            kicker="Estilo de jogo"
            content={classe.gameplay}
            borderClass={theme.frameClass}
            kickerClass={theme.textClass}
            glowClass={theme.glowClass}
          />

          <article className={cardShellClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className={cn("mb-4 h-1.5 w-20 rounded-full", theme.glowClass)} />
                <p className={cn("text-[11px] font-semibold uppercase tracking-[0.28em]", theme.textClass)}>
                  Personagens da classe
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Fichas vinculadas
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Referências visuais e personagens já criados com essa identidade de combate.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Voltar personagens"
                  onClick={() => {
                    setAutoplayStopped(true);
                    personagensApi?.scrollPrev();
                  }}
                  className="rounded-full border border-border/70 p-2 text-muted-foreground transition hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Avançar personagens"
                  onClick={() => {
                    setAutoplayStopped(true);
                    personagensApi?.scrollNext();
                  }}
                  className="rounded-full border border-border/70 p-2 text-muted-foreground transition hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {personagens.length > 8 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllPersonagens((value) => !value)}
                    className="rounded-full border border-border/70 px-4 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    {showAllPersonagens ? "Ver menos" : "Ver mais"}
                  </button>
                ) : null}
              </div>
            </div>

            {personagens.length > 0 ? (
              <div className="mt-5 rounded-[1.75rem] border border-border/60 bg-background/45 p-3 sm:p-4">
                <Carousel
                  setApi={setPersonagensApi}
                  opts={{ align: "start", dragFree: true }}
                  className="w-full"
                  onPointerDown={() => setAutoplayStopped(true)}
                  onFocusCapture={() => setAutoplayStopped(true)}
                >
                  <CarouselContent className="-ml-3">
                    {personagensPreview.map((personagem) => {
                      const nomeVisual = personagem.apelido?.trim() || personagem.nome;
                      const img = personagem.url_imagem || personagem.imagem_pixel;

                      return (
                        <CarouselItem
                          key={personagem.id}
                          className="basis-[78%] pl-3 sm:basis-[48%] lg:basis-[31%] xl:basis-[24%]"
                        >
                          <article className={cn("group h-full overflow-hidden rounded-3xl border bg-background/80 p-3 transition", theme.frameClass)}>
                            <div className="relative overflow-hidden rounded-[1.2rem] border border-border/60 bg-muted/40">
                              <div className={cn("pointer-events-none absolute inset-x-10 top-0 z-10 h-16 rounded-full blur-2xl", theme.glowClass)} />
                              <div className="relative aspect-4/5">
                                {img ? (
                                  <Image
                                    src={img}
                                    alt={nomeVisual}
                                    fill
                                    unoptimized
                                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <UserRound className="h-10 w-10" />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                                  Personagem
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                                  {nomeVisual}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">Destaque</span>
                            </div>
                          </article>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                </Carousel>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Ainda não existem personagens vinculados a esta classe.
              </p>
            )}
          </article>

          <article className={cardShellClass}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className={cn("mb-4 h-1.5 w-20 rounded-full", theme.glowClass)} />
                <p className={cn("text-[11px] font-semibold uppercase tracking-[0.28em]", theme.textClass)}>
                  Grimório
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Magias da classe
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">Toque para abrir os detalhes.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {magias.length > 0 ? (
                magias.map((magia) => (
                  <button
                    key={magia.id}
                    type="button"
                    aria-label={`Abrir magia ${magia.nome}`}
                    onClick={() => abrirMagia(magia)}
                    className="rounded-2xl border border-border/70 bg-background/70 p-4 text-left transition hover:bg-muted/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-foreground">{magia.nome}</p>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {magia.descricao ?? "Sem descrição."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/70 px-2 py-1">
                        Alcance: {magia.alcance ?? "—"}
                      </span>
                      <span className="rounded-full border border-border/70 px-2 py-1">
                        Custo: {magia.custo_nivel ?? "—"}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
                  Nenhuma magia cadastrada para esta classe.
                </div>
              )}
            </div>
          </article>

        </section>
      </main>

      <MagiaDetailsDrawer
        open={!!selectedMagia}
        onOpenChange={(open) => {
          if (!open) setSelectedMagia(null);
        }}
        magia={selectedMagia}
        description="Detalhes da magia, alcance e custo."
      />
    </>
  );
}
