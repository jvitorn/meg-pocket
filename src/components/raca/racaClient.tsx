"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Toaster } from "sonner";
import { ArrowRight, Gem } from "lucide-react";

import type { RacaInterface } from "@/types";
import { RacaDetailSkeleton } from "@/components/skeletons/raca-detail.skeleton";
import { MarkdownContent } from "@/components/world/markdown-content";
import { getLegendInitials, getRacaTheme } from "@/lib/fantasyThemes";
import { cn } from "@/lib/utils";
import { AttributeCard } from "@/components/attribute-card";

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

function StatCard({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: string | number;
  accentClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div
        className={cn("text-[11px] uppercase tracking-[0.28em]", accentClass)}
      >
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export default function RacaPage() {
  const { id } = useParams<{ id: string }>();
  const [raca, setRaca] = useState<RacaInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/racas/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          const msg =
            json?.error ?? `Erro ao buscar raça (status ${res.status})`;
          throw new Error(msg);
        }

        if (mounted) setRaca(json.data as RacaInterface);
      } catch (err) {
        console.error("Erro fetch raça:", err);
        if (mounted) setError((err as Error).message ?? "Erro desconhecido");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const theme = useMemo(() => getRacaTheme(raca ?? {}), [raca]);
  const Icon = theme.icon;
  const initials = getLegendInitials(raca?.nome);
  const cardShellClass = cn(
    "rounded-[2rem] border bg-card/82 p-5 sm:p-6",
    theme.frameClass,
  );

  if (loading) return <RacaDetailSkeleton />;

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

  if (!raca) {
    return (
      <>
        <Toaster position="top-right" />
        <main className="w-full bg-background p-6 text-foreground">
          <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-card/70 p-6 text-center text-muted-foreground">
            Raça não encontrada.
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <main
        style={theme.style}
        className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,rgba(6,8,12,0.96),rgba(12,10,18,0.98))] text-foreground"
      >
        <section className="relative isolate min-h-[72vh] overflow-hidden">
          <div className="absolute inset-0">
            {raca.img ? (
              <Image
                src={raca.img}
                alt={`${raca.nome} - plano de fundo`}
                fill
                priority
                unoptimized
                className="object-cover object-center scale-105"
              />
            ) : (
              <div
                className={cn("h-full w-full bg-linear-to-br", theme.softClass)}
              />
            )}
          </div>

          <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/25" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.08),transparent_20%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.06),transparent_20%)]" />

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative z-20 mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-end px-6 pb-14 pt-32"
          >
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}
                className="relative mx-auto flex w-full max-w-xl items-end justify-center lg:order-1"
              >
                <div
                  className={cn(
                    "absolute inset-x-8 bottom-4 h-24 rounded-full blur-3xl",
                    theme.glowClass,
                  )}
                />
                <div className="relative w-full overflow-hidden rounded-[2.5rem] border border-white/15 bg-black/25 p-3 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                  <div className="relative aspect-4/5 overflow-hidden rounded-4xl border border-white/10 bg-black/30">
                    {raca.img ? (
                      <Image
                        src={raca.img}
                        alt={`${raca.nome} em destaque`}
                        fill
                        unoptimized
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-4 bg-linear-to-b from-white/10 to-black/30 text-center text-white/80">
                        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-black/25 text-3xl font-black">
                          {initials}
                        </div>
                        <div className="max-w-xs px-6 text-sm">
                          A imagem desta raça ainda não foi definida. Enquanto
                          isso, o símbolo e o tema já carregam a identidade
                          visual.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between px-2 pb-1 text-xs text-white/65">
                    <span>{raca.icone ?? "símbolo"}</span>
                    <span className="inline-flex items-center gap-1">
                      <ArrowRight className="h-3.5 w-3.5" />
                      Raça do mundo mágico
                    </span>
                  </div>
                </div>
              </motion.div>

              <div className="max-w-3xl lg:order-2 lg:text-right">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/75 backdrop-blur-md">
                  <Gem className="h-3.5 w-3.5" />
                  Raça / Linhagem
                </div>

                <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                  <div className="rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-white/90 backdrop-blur-md">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-white/55">
                      Selo da raça
                    </div>
                    <div className="mt-1 text-lg font-semibold">{initials}</div>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-black/30 backdrop-blur-md">
                    <Icon className={cn("h-8 w-8", theme.iconClass)} />
                  </div>
                </div>

                <h1 className="mt-6 text-5xl font-black uppercase tracking-[0.12em] text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.5)] md:text-7xl lg:ml-auto">
                  {raca.nome}
                </h1>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-white/82 md:text-xl lg:ml-auto">
                  {raca.descricao ??
                    "Uma raça com legado, atributos e presença marcante para a ficha."}
                </p>

                <div className="mt-8 flex flex-wrap gap-3 lg:justify-end">
                  <StatCard
                    label="HP base"
                    value={raca.hp ?? "—"}
                    accentClass={theme.textClass}
                  />
                  <StatCard
                    label="Mana base"
                    value={raca.mana ?? "—"}
                    accentClass={theme.textClass}
                  />
                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-white/85 backdrop-blur-md">
                    <div
                      className={cn(
                        "text-[11px] uppercase tracking-[0.28em]",
                        theme.textClass,
                      )}
                    >
                      Cor base
                    </div>
                    <div className="mt-2 text-base font-medium">
                      {raca.corTema ?? "zinc"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="relative -mt-10 mx-auto max-w-7xl px-6 pb-20">
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-8"
          >
           
            <motion.article
              variants={itemVariants}
              className="relative overflow-hidden rounded-4xl border border-border/70 bg-card/85 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                Origem
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                História e presença
              </h2>
              <div className="mt-5">
                <MarkdownContent content={raca.descricao} />
              </div>

            </motion.article>
             <motion.article className={cardShellClass}  variants={itemVariants}>
              <div
                className={cn("mb-4 h-1.5 w-20 rounded-full", theme.glowClass)}
              />
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.28em]",
                  theme.textClass,
                )}
              >
                Atributos de ficha
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Base da construção
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Leitura rápida dos pilares iniciais da classe para criação de
                ficha e equilíbrio da build.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <AttributeCard
                  label="HP Base"
                  value={raca.hp ?? 0}
                  helper="Reserva inicial de sobrevivência da classe."
                  tone="border-rose-500/30 bg-rose-500/5"
                />
                <AttributeCard
                  label="Mana Base"
                  value={raca.mana ?? 0}
                  helper="Energia disponível para magias e habilidades."
                  tone="border-blue-500/30 bg-blue-500/5"
                />
                <AttributeCard
                  label="Total Base"
                  value={(raca.hp ?? 0) + (raca.mana ?? 0)}
                  helper="Visão geral do fôlego bruto da classe no começo."
                  tone="border-emerald-500/30 bg-emerald-500/5"
                />
              </div>
            </motion.article>
            <motion.article
              variants={itemVariants}
              className="relative overflow-hidden rounded-4xl border border-border/70 bg-card/85 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Habilidade diária
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {raca.habilidadeDiariaNome ?? "Talento racial"}
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-7 text-muted-foreground">
                  Dois usos narrativos bem claros: um para combate e outro para
                  decisões fora dele.
                </p>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <div className="rounded-3xl border border-border/70 bg-linear-to-b from-background to-muted/40 p-4">
                  <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-red-700 dark:text-red-100">
                    Combate
                  </div>
                  <div className="mt-4">
                    <MarkdownContent content={raca.habilidadeDiariaCombate} />
                  </div>
                </div>

                <div className="rounded-3xl border border-border/70 bg-linear-to-b from-background to-muted/40 p-4">
                  <div className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-100">
                    Fora de combate
                  </div>
                  <div className="mt-4">
                    <MarkdownContent
                      content={raca.habilidadeDiariaForaDeCombate}
                    />
                  </div>
                </div>
              </div>
            </motion.article>
           
          </motion.div>
        </section>

        <div className="h-16" />
      </main>
    </>
  );
}
