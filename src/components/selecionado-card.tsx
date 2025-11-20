'use client';
import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderIcon } from "@/components/render-icon";
import { cn } from "@/lib/utils";
import { BaseInterface } from "@/types";

interface SelecionadoCardProps extends BaseInterface {
  sobre?: string;
  mana_atual?: number;
  hp_atual?: number;
}
// Interface para os props com valores opcionais
interface Props {
  selectedRace?: SelecionadoCardProps;
  url : string;
}

// Objeto padrão para a raça
const defaultRace: SelecionadoCardProps = {
  id: 0,
  nome: "Nome não informado",
  descricao: "Selecione uma opção para visualizar suas características e informações.",
  mana: 0,
  hp: 0,
  sobre: ""
};

export default function SelecionadoCard({
  selectedRace = defaultRace, // Valor padrão aqui
  url
}: Props) {
  // Usando a raça selecionada ou a padrão
  const race = selectedRace || defaultRace;

  return (
    <>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-xl light:shadow-xl">
        {/* Imagem (mantive exatamente como o seu original) */}
        <div className="relative w-full h-[280px] md:h-[360px]">
          <div className="relative w-full h-full transition-transform duration-200 ease-in-out hover:scale-110">
            <Image
              src={race.imagem_pixel ?? ""}
              alt={race.nome}
              fill
              className="object-contain h-full mx-auto light:drop-shadow-xl"
            />
          </div>
        </div>

        {/* Informações da classe (apenas mudanças nesta seção) */}
        <div className="flex flex-col justify-center relative">
          <h2 className="text-4xl font-extrabold tracking-tight mb-2 uppercase">
            {race.nome}
          </h2>

          {/* descrição: usa `.sobre` se existir, senão volta para `.descricao` */}
          <p
            className={cn(
              "text-sm text-zinc-450 mb-4 leading-relaxed text-justify",
              "text-zinc-400"
            )}
          >
            {race.sobre ? race.sobre : race.descricao}
          </p>

          {/* --- BLOCO SIMPLIFICADO --- */}
          <div className="mt-2 space-y-4">
            {/* Badges de stats (HP / MANA) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 border border-red-500 rounded-lg p-3 text-center">
                <div className="text-[10px] uppercase text-zinc-400">HP</div>
                <div className="font-semibold text-white">{race.hp_atual ?? "—"}</div>
              </div>

              <div className="bg-white/5 border border-primary rounded-lg p-3 text-center col-span-2">
                <div className="text-[10px] uppercase text-zinc-400">MANA</div>
                <div className="font-semibold text-white">{race.mana_atual ?? "—"}</div>
              </div>
            </div>

            {/* Botões de ação (mantive seu Ver detalhes, estilizei botão "Ver Ficha" roxo) */}
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              {race.id !== 0 ? (
                <>
                  <Button
                    asChild
                    variant="secondary"
                    size="lg"
                    className="flex items-center gap-2 text-xs px-3 py-1 rounded-md shadow-md transition bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    <Link href={`${url}`}>
                      <Info className="w-4 h-4" /> Ver Ficha
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="text-xs text-zinc-500 italic">Escolha um personagem para ver mais opções.</div>
              )}
            </div>

            <div className="mt-2 text-xs text-zinc-500 uppercase">Pressione — selecionar para abrir a ficha</div>
          </div>
          {/* --- fim do bloco modificado --- */}
        </div>
      </div>
    </>
  );
}
