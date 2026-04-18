"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Toaster } from "sonner";
import { SearchX } from "lucide-react";

import { PersonagemFichaSkeleton } from "@/components/skeletons/personagem-ficha.skeleton";
import { EmptyState } from "@/components/empty-state";

import { PersonagemInterface } from "@/types";
import { PersonagemView } from "./personagem-view";

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

  /* ---------------- Renderização ---------------- */
  return (
    <>
      <Toaster position="top-right" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <PersonagemView
          personagem={personagem}
          setPersonagem={setPersonagem}
          canEdit={canEdit}
        />
      </motion.div>
    </>
  );
}
