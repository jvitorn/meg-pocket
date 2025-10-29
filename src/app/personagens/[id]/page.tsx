"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Personagem } from "@/types/personagem";
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

// Tipo para elementos
type ElementType = "natureza" | "agua" | "fogo" | "vento";
interface Spell {
  name: string;
  description: string;
}
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
  const characterElement: ElementType = "natureza";
  const spells: Spell[] = [
    { name: "Cura Natural", description: "Restaura 5 pontos de vida" },
    { name: "Espinhos", description: "Causa 3 de dano ao inimigo" },
    { name: "Crescimento", description: "Aumenta defesa por 2 turnos" },
  ];

  const currentElement = elements[characterElement];
  const ElementIcon = currentElement.icon;

  const { id } = useParams<{ id: string }>();
  const [personagem, setPersonagem] = useState<Personagem>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchPersonagens = async () => {
      try {
        const response = await fetch(`/api/personagem/${id}`);
        if (!response.ok) throw new Error("Erro ao carregar personagens");
        const data: Personagem = await response.json();
        setPersonagem(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonagens();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error)
    return <div className="text-center mt-10 text-red-500">Erro: {error}</div>;

  return (
    <>
      <Navbar />
      <Card className="w-full bg-accent text-accent-foreground border-0 overflow-hidden shadow-2xl">
        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {/* Avatar centralizado */}
        <div className="flex justify-center">
          <Avatar className="w-32 h-32 border-4 border-accent-foreground/20">
            <AvatarImage 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" 
              alt="Monai"
            />
            <AvatarFallback className="text-3xl font-bold">MN</AvatarFallback>
          </Avatar>
        </div>
          {/* Nome e classes centralizados */}
        <div className="space-y-2 text-center">
          <h2 className="text-4xl font-black tracking-tight">Monai</h2>
          
          {/* Classes/Raça */}
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-accent-foreground/10 rounded text-xs font-medium">
              Guerreiro
            </span>
            <span className="px-3 py-1 bg-accent-foreground/10 rounded text-xs font-medium">
              Elfo
            </span>
          </div>
        </div>
          {/* Estatísticas reorganizadas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-accent-foreground/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">10/10</div>
            <div className="text-xs uppercase tracking-wider">Mana</div>
          </div>
          <div className="bg-accent-foreground/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">10/10</div>
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
              Guerreiro élfico nascido nas florestas ancestrais. Domina a magia
              da natureza e usa sua conexão com os elementos para proteger seu
              povo.
            </p>
          </div>
          {/* Seção MAGIAS */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Magias
            </h3>
            <div className="space-y-2">
              {spells.map((spell, index) => (
                <div
                  key={index}
                  className="bg-accent-foreground/10 p-4 rounded-md hover:bg-accent-foreground/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{spell.name}</div>
                      <div className="text-xs opacity-80">
                        {spell.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
