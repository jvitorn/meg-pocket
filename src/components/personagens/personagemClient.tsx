"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Toaster } from "sonner";
import { Maximize2, Minimize2, SearchX } from "lucide-react";

import { PersonagemFichaSkeleton } from "@/components/skeletons/personagem-ficha.skeleton";
import { EmptyState } from "@/components/empty-state";

import { PersonagemInterface } from "@/types";
import { PersonagemView } from "./personagem-view";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Button } from "@/components/ui/button";
import { getThemeByColor } from "@/lib/fantasyThemes";
import { cn } from "@/lib/utils";
import { getElementoThemeColor } from "@/lib/personagemElementoTheme";

type FriendlyErrorState = {
  title: string;
  description: string;
};

function mapPersonagemErrorState(
  status?: number
): FriendlyErrorState {
  if (status === 400) {
    return {
      title: "ID de personagem inválido",
      description:
        "Esse endereço não parece apontar para uma ficha válida. Volte para as campanhas e tente abrir a ficha por outro caminho.",
    };
  }

  if (status === 404) {
    return {
      title: "Ficha não encontrada",
      description:
        "Não encontramos esse personagem na base. Ele pode ter sido removido ou o link pode estar incompleto.",
    };
  }

  return {
    title: "Não foi possível carregar a ficha",
    description:
      "Houve um problema ao buscar os dados agora. Tente novamente mais tarde ou volte para as campanhas.",
  };
}

export default function PersonagemClient() {
  const { id } = useParams<{ id: string }>();

  const [personagem, setPersonagem] = useState<PersonagemInterface | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<FriendlyErrorState | null>(null);
  const [expanded, setExpanded] = useState(false);

  /* ---------------- Carregar personagem ---------------- */
  useEffect(() => {
    if (!id) {
      setLoading(false);
      setErrorState({
        title: "ID de personagem inválido",
        description:
          "Não conseguimos ler esse identificador. Volte para as campanhas e escolha uma ficha existente.",
      });
      return;
    }

    setLoading(true);
    setErrorState(null);
    setPersonagem(null);

    const fetchPersonagem = async () => {
      try {
        const response = await fetch(`/api/personagem/${id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          setErrorState(mapPersonagemErrorState(response.status));
          return;
        }

        const data: PersonagemInterface = await response.json();
        setPersonagem(data);
      } catch (error: unknown) {
        const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
        setErrorState(mapPersonagemErrorState(status));
      } finally {
        setLoading(false);
      }
    };

    fetchPersonagem();
  }, [id]);

  /* ---------------- Estados de carregamento ---------------- */
  if (loading) return <PersonagemFichaSkeleton />;
  if (errorState)
    return (
      <EmptyState
        Icon={SearchX}
        title={errorState.title}
        description={errorState.description}
        actionHref="/campanhas"
        actionLabel="Voltar para campanhas"
      />
    );
  if (!personagem) return null;
  const canEdit = Boolean(personagem.canEdit);
  const fichaTheme = getThemeByColor(
    getElementoThemeColor(personagem.elemento),
    "violet"
  );

  /* ---------------- Renderização ---------------- */
  return (
    <>
      <Toaster position="top-right" />

      <motion.div
        style={fichaTheme.style}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative isolate min-h-screen overflow-hidden py-6 sm:py-8"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_10%,var(--theme-glow),transparent_28%),radial-gradient(circle_at_86%_14%,var(--theme-soft-from),transparent_26%),radial-gradient(circle_at_50%_92%,var(--theme-glow),transparent_30%),linear-gradient(180deg,var(--background),color-mix(in_srgb,var(--theme-soft-from)_42%,var(--background)))] opacity-95 dark:opacity-90" />
        <div className="pointer-events-none absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse dark:border-(--theme-ring) [--pulse-opacity-max:0.5] [--pulse-opacity-min:0.18] animation-duration-[3.8s]" />
        <div className="pointer-events-none absolute -right-20 top-32 -z-10 h-64 w-64 rounded-full border border-(--theme-chip-border) bg-(--theme-soft-from) animate-soft-pulse dark:border-(--theme-chip-border) [animation-delay:0.8s] [--pulse-opacity-max:0.44] [--pulse-opacity-min:0.16] animation-duration-[4.1s]" />
        <div className="pointer-events-none absolute left-[15%] bottom-20 -z-10 h-44 w-44 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse dark:border-(--theme-ring) [animation-delay:1.4s] [--pulse-opacity-max:0.36] [--pulse-opacity-min:0.12] animation-duration-[3.7s]" />
        <div className="pointer-events-none absolute right-[22%] bottom-40 -z-10 h-28 w-28 rounded-full border border-(--theme-chip-border) bg-(--theme-surface-strong) animate-soft-pulse dark:border-(--theme-chip-border) [animation-delay:2s] [--pulse-opacity-max:0.34] [--pulse-opacity-min:0.12] animation-duration-[3.5s]" />
        <div className="pointer-events-none absolute left-[4%] top-[38%] -z-10 h-36 w-36 rounded-full border border-(--theme-chip-border) bg-(--theme-soft-from) animate-soft-pulse dark:border-(--theme-chip-border) [animation-delay:0.5s] [--pulse-opacity-max:0.36] [--pulse-opacity-min:0.13] animation-duration-[3.8s]" />
        <div className="pointer-events-none absolute right-[8%] bottom-[18%] -z-10 h-52 w-52 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse dark:border-(--theme-ring) [animation-delay:1.6s] [--pulse-opacity-max:0.32] [--pulse-opacity-min:0.1] animation-duration-[4.3s]" />
        <div className="pointer-events-none absolute left-[30%] top-28 -z-10 h-16 w-16 rotate-45 rounded-lg border border-(--theme-chip-border) bg-(--theme-surface-muted) animate-soft-pulse dark:border-(--theme-chip-border) [animation-delay:1s] [--pulse-opacity-max:0.32] [--pulse-opacity-min:0.1] animation-duration-[3.6s]" />
        <div className="pointer-events-none absolute right-[34%] top-[18%] -z-10 h-20 w-20 rotate-12 rounded-2xl border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse dark:border-(--theme-ring) [animation-delay:2.1s] [--pulse-opacity-max:0.28] [--pulse-opacity-min:0.09] animation-duration-[3.8s]" />
        <div className="pointer-events-none absolute left-[8%] bottom-[34%] -z-10 h-12 w-44 -rotate-12 rounded-full border border-(--theme-chip-border) bg-(--theme-surface-muted) animate-soft-pulse dark:border-(--theme-chip-border) [animation-delay:0.3s] [--pulse-opacity-max:0.3] [--pulse-opacity-min:0.09] animation-duration-[4s]" />
        <div className="pointer-events-none absolute right-[3%] top-[55%] -z-10 h-10 w-32 rotate-45 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse dark:border-(--theme-ring) [animation-delay:2.4s] [--pulse-opacity-max:0.26] [--pulse-opacity-min:0.08] animation-duration-[3.9s]" />
        <div className="pointer-events-none absolute left-[42%] bottom-[12%] -z-10 h-24 w-24 rounded-full border border-(--theme-chip-border) bg-(--theme-soft-from) animate-soft-pulse dark:border-(--theme-chip-border) [animation-delay:1.2s] [--pulse-opacity-max:0.28] [--pulse-opacity-min:0.09] animation-duration-[4.1s]" />
        <div className="pointer-events-none absolute left-[55%] top-[42%] -z-10 h-28 w-28 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse dark:border-(--theme-ring) [animation-delay:0.9s] [--pulse-opacity-max:0.24] [--pulse-opacity-min:0.08] animation-duration-[3.9s]" />
        <div className="pointer-events-none absolute inset-x-8 top-1/4 -z-10 h-32 rounded-full bg-(--theme-glow) opacity-65 blur-3xl animate-soft-pulse dark:opacity-55 [animation-delay:1s] animation-duration-[3.8s]" />
        <div className="pointer-events-none absolute left-[12%] top-[62%] -z-10 h-40 w-40 rounded-full border border-(--theme-ring) bg-(--theme-glow) animate-soft-pulse dark:border-(--theme-ring) [animation-delay:2.7s] [--pulse-opacity-max:0.28] [--pulse-opacity-min:0.09] animation-duration-[4.2s]" />
        <div className="pointer-events-none absolute right-[16%] top-[72%] -z-10 h-16 w-52 rotate-12 rounded-full border border-(--theme-chip-border) bg-(--theme-surface-muted) animate-soft-pulse dark:border-(--theme-chip-border) [animation-delay:1.9s] [--pulse-opacity-max:0.28] [--pulse-opacity-min:0.08] animation-duration-[4s]" />
        <div className="pointer-events-none absolute left-[46%] top-[84%] -z-10 h-24 w-24 rotate-45 rounded-2xl border border-(--theme-ring) bg-(--theme-soft-from) animate-soft-pulse dark:border-(--theme-ring) [animation-delay:0.6s] [--pulse-opacity-max:0.26] [--pulse-opacity-min:0.08] animation-duration-[4.1s]" />
        <div className="pointer-events-none absolute -right-12 top-[88%] -z-10 h-64 w-64 rounded-full border border-(--theme-chip-border) bg-(--theme-glow) animate-soft-pulse dark:border-(--theme-chip-border) [animation-delay:3.1s] [--pulse-opacity-max:0.3] [--pulse-opacity-min:0.09] animation-duration-[4.4s]" />

        <div
          className={cn(
            "relative z-10 mx-auto transition-all duration-300",
            expanded
              ? "w-full max-w-none px-0"
              : "max-w-5xl px-4 sm:px-6 lg:px-8"
          )}
        >
          <div
            className={cn(
              "mb-4 flex items-start justify-between gap-3",
              expanded && "px-4 sm:px-6"
            )}
          >
            <AppBreadcrumb
              className="mb-0 min-w-0 flex-1"
              items={[
                {
                  label: "Campanha",
                  href: `/personagens/campanha/${personagem.campanhaId}`,
                },
                { label: personagem.nome },
              ]}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0 border-(--theme-chip-border) bg-background/70 backdrop-blur"
              aria-label={expanded ? "Recolher ficha" : "Expandir ficha"}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <header className={cn("mb-6 text-center", expanded && "px-4 sm:px-6")}>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              Ficha
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Informações sobre seu personagem
            </p>
          </header>

          <motion.div
            layout
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <PersonagemView
              personagem={personagem}
              setPersonagem={setPersonagem}
              canEdit={canEdit}
              expanded={expanded}
            />
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
