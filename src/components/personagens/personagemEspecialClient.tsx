"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Toaster } from "sonner";
import { PersonagemInterface } from "@/types";
import { PersonagemEspecialSkeleton } from "@/components/skeletons/personagem-especial.skeleton";
import { PersonagemActions } from "./ficha/PersonagemActions";
import { PersonagemView } from "./personagem-view";

export default function PersonagemEspecialClient() {
  const { id } = useParams<{ id: string }>();
  const [personagem, setPersonagem] = useState<PersonagemInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchPersonagem = async () => {
      try {
        const response = await fetch(`/api/personagem/especial/${id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Erro ao carregar personagem especial");
        }

        const data: PersonagemInterface = await response.json();
        setPersonagem(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar personagem especial"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPersonagem();
  }, [id]);

  if (loading) return <PersonagemEspecialSkeleton />;
  if (error) return <div className="text-center text-red-500 mt-6">{error}</div>;
  if (!personagem) return null;

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
          canEdit={Boolean(personagem.canEdit)}
          extraSection={
            <PersonagemActions
              personagem={personagem}
              setPersonagem={setPersonagem}
              canEdit={Boolean(personagem.canEdit)}
            />
          }
        />
      </motion.div>
    </>
  );
}
