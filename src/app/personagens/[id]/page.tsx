"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { PersonagemInterface } from "@/types/personagem";
import { LoadingSpinner } from "@/components/loadingSpinner";
import { Card } from "@/components/ui/card";

import {
  Leaf,
  Droplet,
  Flame,
  Wind,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Footer } from "@/components/footer";

// Tipo para elementos
type ElementType = "natureza" | "agua" | "fogo" | "vento";

interface Element {
  type: ElementType;
  icon: typeof Leaf;
  color: string;
  bgColor: string;
}
// Configuração dos elementos
const elements: Record<ElementType, Element> = {
  natureza: {
    type: "natureza",
    icon: Leaf,
    color: "text-green-900",
    bgColor: "bg-green-500",
  },
  agua: {
    type: "agua",
    icon: Droplet,
    color: "text-blue-900",
    bgColor: "bg-blue-500",
  },
  fogo: {
    type: "fogo",
    icon: Flame,
    color: "text-red-900",
    bgColor: "bg-red-500",
  },
  vento: {
    type: "vento",
    icon: Wind,
    color: "text-gray-700",
    bgColor: "bg-gray-300",
  },
};

export default function PersonagemUnicoPage() {
  // Dados do personagem (você pode passar via props depois)


  const { id } = useParams<{ id: string }>();
  const [personagem, setPersonagem] = useState<PersonagemInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchPersonagens = async () => {
      try {
        const response = await fetch(`/api/personagem/${id}`);
        if (!response.ok) throw new Error("Erro ao carregar personagens");
        const data: PersonagemInterface = await response.json();
        setPersonagem(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonagens();
  }, [id]);

  const characterElement: ElementType = useMemo(() => {
    const validElements: ElementType[] = ["natureza", "agua", "fogo", "vento"];
    return validElements.includes(personagem?.elemento as ElementType)
      ? personagem?.elemento as ElementType
      : "natureza";
  }, [personagem?.elemento]);

  const currentElement = elements[characterElement];
  const ElementIcon = currentElement.icon;

  if (loading) return <LoadingSpinner />;
  if (error)
    return <div className="text-center mt-10 text-red-500">Erro: {error}</div>;

  return (
    <>
      <Navbar />
      <Card className="bg-accent text-accent-foreground border-0 overflow-hidden shadow-2xl">
        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {/* Avatar centralizado */}
          <div className="flex justify-center">
            <Avatar className="w-32 h-32 border-4 border-primary/20">
              <AvatarImage
                src={personagem?.url_imagem}
                alt={personagem?.nome}
              />
              <AvatarFallback className="text-3xl font-bold">MN</AvatarFallback>
            </Avatar>
          </div>
          {/* Nome e classes centralizados */}
          <div className="space-y-2 text-center">
            <h2 className="text-4xl font-black text-foreground tracking-tight capitalize">{personagem?.nome}</h2>

            {/* Classes/Raça */}
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 bg-primary/10 rounded text-xs font-medium">
                {personagem?.classe_nome}
              </span>
              <span className="px-3 py-1 bg-primary/10 rounded text-xs font-medium">
                {personagem?.raca_nome}
              </span>
            </div>
          </div>
          {/* Estatísticas reorganizadas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-accent-foreground/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{personagem?.mana_atual}/{personagem?.mana}</div>
              <div className="text-xs uppercase tracking-wider">Mana</div>
            </div>
            <div className="bg-accent-foreground/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{personagem?.hp_atual}/{personagem?.hp}</div>
              <div className="text-xs uppercase tracking-wider">Vida</div>
            </div>
          </div>
          {/* Card de Elemento */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Elemento
            </h3>
            <div
              className={`${currentElement.bgColor} ${currentElement.color} p-4 rounded-md flex items-center gap-3 shadow-sm`}
            >
              <ElementIcon className="w-4 h-4 font-semibold" />
              <span className="font-semibold capitalize">
                {characterElement}
              </span>
            </div>
          </div>
          {/* Seção ABOUT */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Sobre
            </h3>
            <p className="text-sm leading-relaxed">
              {personagem?.sobre}
            </p>
          </div>
          {/* Seção MAGIAS */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Magias
            </h3>
            <div className="space-y-2">
              {personagem?.magias && personagem.magias.length > 0 ? (
                personagem.magias.map((magia, index) => (
                  <div
                    key={index}
                    className="bg-primary/10 p-4 rounded-md hover:bg-accent-foreground/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-6 h-6 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{magia.nome}</div>
                        <div className="text-xs opacity-80">
                          {magia.descricao}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm opacity-70">Nenhuma magia encontrada</p>
              )}
            </div>
          </div>
        </div>
      </Card>
      <Footer />
    </>
  );
}
