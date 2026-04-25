"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PersonagemInterface } from "@/types";
import { getPersonagensNaCampanha } from "@/services/personagemService";
import { MultiCardItem } from "@/components/multi-card-item";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsDown, ChevronsUp, SearchX } from "lucide-react";
import SelecionadoCard from "@/components/selecionado-card";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/empty-state";
import { PersonagemCampanhaPageSkeleton } from "@/components/skeletons/personagem-campanha-page.skeleton";
import { getThemeByColor } from "@/lib/fantasyThemes";
import { cn } from "@/lib/utils";

type FriendlyErrorState = {
  title: string;
  description: string;
};

function mapCampanhaErrorState(
  status?: number
): FriendlyErrorState {
  if (status === 400) {
    return {
      title: "ID de campanha inválido",
      description:
        "Esse endereço não parece apontar para uma campanha válida. Volte para a lista de campanhas e tente de novo.",
    };
  }

  if (status === 404) {
    return {
      title: "Campanha não encontrada",
      description:
        "Não encontramos essa campanha na base. Ela pode ter sido removida ou o link pode estar incompleto.",
    };
  }

  return {
    title: "Não foi possível carregar a campanha",
    description:
      "Houve um problema ao buscar os personagens agora. Tente novamente mais tarde ou volte para as campanhas.",
  };
}

export default function PersonagemCampanhaPage() {
  const { id } = useParams<{ id: string }>();
  const [personagens, setPersonagens] = useState<PersonagemInterface[]>([]);
  const [personagemSelecionado, setPersonagemSelecionado] =
    useState<PersonagemInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<FriendlyErrorState | null>(null);
  const [showCarousel, setShowCarousel] = useState(true);
  const isMobile = useIsMobile();
  const selectedTheme = getThemeByColor(personagemSelecionado?.corTema, "violet");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setErrorState({
        title: "ID de campanha inválido",
        description:
          "Não conseguimos ler esse identificador. Volte para a lista de campanhas e escolha uma campanha existente.",
      });
      return;
    }

    setLoading(true);
    setErrorState(null);
    setPersonagens([]);
    setPersonagemSelecionado(null);

    const loadPersonagensCampanha = async () => {
      try {
        const dataPersonagensCampanha: PersonagemInterface[] =
          await getPersonagensNaCampanha(Number(id));
        setPersonagens(dataPersonagensCampanha);
        setPersonagemSelecionado(dataPersonagensCampanha[0]);
      } catch (err) {
        const status =
          err instanceof Error ? (err as Error & { status?: number }).status : undefined;
        setErrorState(mapCampanhaErrorState(status));
      } finally {
        setLoading(false);
      }
    };

    loadPersonagensCampanha();
  }, [id]);

  if (loading) {
    return <PersonagemCampanhaPageSkeleton />;
  }

  if (errorState) {
    return (
      <EmptyState
        Icon={SearchX}
        title={errorState.title}
        description={errorState.description}
        actionHref="/campanhas"
        actionLabel="Voltar para campanhas"
      />
    );
  }

  if (!personagens.length) {
    return (
      <EmptyState
        Icon={SearchX}
        title="Nenhum personagem nesta campanha"
        description="A campanha existe, mas ainda não tem fichas cadastradas. Você pode voltar para a lista de campanhas e escolher outra mesa."
        actionHref="/campanhas"
        actionLabel="Voltar para campanhas"
      />
    );
  }

  return (
    <div
      style={selectedTheme.style}
      className={cn(
        "relative isolate min-h-screen overflow-hidden px-4 py-10 transition-colors duration-700 sm:px-6 lg:px-8",
        "bg-linear-to-br from-(--theme-soft-from) via-background/95 to-background"
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-(--theme-ring) opacity-60 transition-colors duration-700 dark:opacity-45" />
      <div className="pointer-events-none absolute right-[12%] top-24 h-28 w-28 rounded-full border border-(--theme-chip-border) opacity-50 transition-colors duration-700 dark:opacity-35" />
      <div className="pointer-events-none absolute left-[6%] top-28 h-40 w-40 rounded-full border border-(--theme-ring) opacity-45 transition-colors duration-700 dark:opacity-30" />
      <div className="pointer-events-none absolute left-[22%] top-[42%] h-24 w-24 rounded-full border border-(--theme-chip-border) opacity-40 transition-colors duration-700 dark:opacity-25" />
      <div className="pointer-events-none absolute right-[18%] top-[48%] h-44 w-44 rounded-full border border-(--theme-ring) opacity-40 transition-colors duration-700 dark:opacity-25" />
      <div className="pointer-events-none absolute -bottom-36 left-1/3 h-96 w-96 rounded-full border border-(--theme-ring) opacity-40 transition-colors duration-700 dark:opacity-25" />
      <div className="pointer-events-none absolute -bottom-20 -left-24 h-64 w-64 rounded-full border border-(--theme-chip-border) opacity-45 transition-colors duration-700 dark:opacity-30" />
      <div className="pointer-events-none absolute inset-x-6 top-1/3 h-32 rounded-full bg-(--theme-glow) opacity-85 blur-3xl transition-colors duration-700 dark:opacity-70" />
      <div className="pointer-events-none absolute inset-x-24 bottom-20 h-24 rounded-full bg-(--theme-glow) opacity-60 blur-3xl transition-colors duration-700 dark:opacity-45" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Personagens da campanha
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha uma ficha para abrir os detalhes do personagem
          </p>
        </header>

        <motion.div
          layout
          className={cn(
            "mt-8 space-y-8",
            !showCarousel &&
              "flex min-h-[calc(100vh-13rem)] flex-col justify-center"
          )}
          transition={{ duration: 0.38, ease: [0.4, 0.0, 0.2, 1] }}
        >
          {personagemSelecionado && (
            <SelecionadoCard
              selectedRace={personagemSelecionado}
              url={`/personagens/${personagemSelecionado.id}`}
            />
          )}

          <div className="flex justify-center">
            <Button
              onClick={() => {
                setShowCarousel((current) => !current);
              }}
              variant="ghost"
              className="flex items-center gap-2 border border-(--theme-chip-border) bg-background/40 text-sm text-muted-foreground backdrop-blur-sm transition hover:bg-background/70 hover:text-foreground"
            >
              {showCarousel ? (
                <>
                  <ChevronsDown className="h-5 w-5" /> Ocultar Personagens
                </>
              ) : (
                <>
                  <ChevronsUp className="h-5 w-5" /> Mostrar Personagens
                </>
              )}
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {showCarousel && (
              <motion.div
                key="carousel"
                initial={{ height: 0, opacity: 0, y: 12 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 12 }}
                transition={{ duration: 0.32, ease: [0.4, 0.0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <MultiCardItem.Carousel
                  items={personagens}
                  selectedId={personagemSelecionado?.id || 1}
                  onSelect={(item) => {
                    setPersonagemSelecionado(item);
                    if (isMobile) {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  onButtonClick={(item) => console.log("ver mais:", item)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
