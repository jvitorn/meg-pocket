"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PersonagemInterface } from "@/types";
import { Navbar } from "@/components/navbar";
import { getPersonagensNaCampanha } from "@/services/personagemService";
import { MultiCardItem } from "@/components/multi-card-item";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsDown, ChevronsUp } from "lucide-react";
import SelectedCardSkeleton from "@/components/skeletons/selected-card.skeleton";
import SelecionadoCard from "@/components/selecionado-card";
import { Footer } from "@/components/footer";
import { MultiCardItemSkeleton } from "@/components/skeletons/multi-card-item.skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PersonagemCampanhaPage() {
  const { id } = useParams<{ id: string }>();
  const [personagens, setPersonagens] = useState<PersonagemInterface[]>([]);
  const [personagemSelecionado, setPersonagemSelecionado] =
    useState<PersonagemInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!id) return;

    const loadPersonagensCampanha = async () => {
      try {
        const dataPersonagensCampanha: PersonagemInterface[] =
          await getPersonagensNaCampanha(Number(id));
        setPersonagens(dataPersonagensCampanha);
        setPersonagemSelecionado(dataPersonagensCampanha[0]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadPersonagensCampanha();
  }, [id]);

  // if (loading) return <LoadingSpinner/>;
  if (error)
    return <div className="text-center mt-10 text-red-500">Erro: {error}</div>;

  return (
    <>
      <motion.div
        layout
        className={`min-h-screen px-6 py-10 ${
          compactMode
            ? "flex flex-col justify-center items-center space-y-8"
            : "space-y-10"
        }`}
        transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
      >
        <h1 className={`text-3xl font-bold uppercase text-center`}>
          Escolha um Personagem
        </h1>

        {loading ? (
          <SelectedCardSkeleton />
        ) : (
          personagemSelecionado && (
            <SelecionadoCard
              selectedRace={personagemSelecionado}
              url={`/personagens/${personagemSelecionado.id}`}
            />
          )
        )}

        <div className="flex justify-center">
          <Button
            onClick={() => {
              if (showCarousel) {
                setShowCarousel(false);
                setTimeout(() => setCompactMode(true), 400);
              } else {
                setCompactMode(false);
                setTimeout(() => setShowCarousel(true), 10);
              }
            }}
            variant="ghost"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-foreground"
          >
            {showCarousel ? (
              <>
                <ChevronsDown className="w-5 h-5" /> Ocultar Raças
              </>
            ) : (
              <>
                <ChevronsUp className="w-5 h-5" /> Mostrar Raças
              </>
            )}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {showCarousel && (
            <motion.div
              key="carousel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              {loading ? (
                <MultiCardItemSkeleton.Carousel />
              ) : (
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
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
