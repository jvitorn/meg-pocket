"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Toaster } from "sonner";

import { LoadingSpinner } from "@/components/loadingSpinner";
import { Card } from "@/components/ui/card";

import { PersonagemInterface } from "@/types";

/* Sessões da ficha */
import { PersonagemHeader } from "./ficha/PersonagemHeader";
import { PersonagemBarras } from "./ficha/PersonagemBarras";
import { PersonagemSobre } from "./ficha/PersonagemSobre";
import { PersonagemPericias } from "./ficha/PersonagemPericias";
import { PersonagemMagias } from "./ficha/PersonagemMagias";

/* Elementos */
import { Leaf, Droplet, Flame, Wind } from "lucide-react";

type ElementType = "natureza" | "agua" | "fogo" | "vento";

const elements = {
  natureza: { icon: Leaf, bgColor: "bg-green-500", color: "text-green-900" },
  agua: { icon: Droplet, bgColor: "bg-blue-500", color: "text-blue-900" },
  fogo: { icon: Flame, bgColor: "bg-red-500", color: "text-red-900" },
  vento: { icon: Wind, bgColor: "bg-gray-300", color: "text-gray-700" },
};

export default function PersonagemClient() {
  const { id } = useParams<{ id: string }>();

  const [personagem, setPersonagem] = useState<PersonagemInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- Carregar personagem ---------------- */
  useEffect(() => {
    if (!id) return;

    const fetchPersonagem = async () => {
      try {
        const response = await fetch(`/api/personagem/${id}`, {
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Erro ao carregar personagem");

        const data: PersonagemInterface = await response.json();
        setPersonagem(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonagem();
  }, [id]);

  /* ---------------- Elemento visual ---------------- */
  const elemento: ElementType = useMemo(() => {
    const val = personagem?.elemento as ElementType;
    return ["natureza", "agua", "fogo", "vento"].includes(val)
      ? val
      : "natureza";
  }, [personagem]);

  const ElementIcon = elements[elemento].icon;

  /* ---------------- Estados de carregamento ---------------- */
  if (loading) return <LoadingSpinner />;
  if (error)
    return <div className="text-center text-red-500 mt-6">{error}</div>;
  if (!personagem) return null;

  /* ---------------- Renderização ---------------- */
  return (
    <>
      <Toaster position="top-right" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="overflow-hidden shadow-lg p-4 md:p-6 bg-background border border-border">
          <div className="md:grid md:grid-cols-[280px_1fr] gap-6">

            {/* ---------------- COLUNA ESQUERDA ---------------- */}
            <aside className="flex flex-col gap-6 md:sticky md:top-20">

              <PersonagemHeader
                nome={personagem.nome}
                classe={personagem.classe_nome}
                raca={personagem.raca_nome}
                urlImagem={personagem.url_imagem}
              />

              <PersonagemBarras
                personagem={personagem}
                setPersonagem={setPersonagem}
              />
            </aside>

            {/* ---------------- COLUNA DIREITA ---------------- */}
            <section className="flex flex-col gap-6">

              {/* Elemento */}
              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Elemento
                </h3>

                <div
                  className={`mt-2 p-3 rounded-md flex items-center gap-3 ${elements[elemento].bgColor} ${elements[elemento].color}`}
                >
                  <ElementIcon className="w-5 h-5" />
                  <span className="font-semibold capitalize">{elemento}</span>
                </div>
              </div>

              {/* Sobre */}
              <PersonagemSobre
                personagem={personagem}
                setPersonagem={setPersonagem}
              />

              {/* Perícias */}
              <PersonagemPericias pericias={personagem.pericias ?? []} />

              {/* Magias */}
              <PersonagemMagias
                personagem={personagem}
                setPersonagem={setPersonagem}
              />

            </section>
          </div>
        </Card>
      </motion.div>
    </>
  );
}
