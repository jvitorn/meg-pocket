'use client';
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Info, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BaseInterface } from "@/types";
import { getThemeByColor } from "@/lib/fantasyThemes";

interface SelecionadoCardProps extends BaseInterface {
  sobre?: string;
  mana_atual?: number;
  hp_atual?: number;
  url_imagem?: string;
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
  const theme = getThemeByColor(race.corTema, "zinc");
  const imageSrc = race.imagem_pixel || race.url_imagem || race.img || "";
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const imageFailed = Boolean(imageSrc && failedImageSrc === imageSrc);
  const description =
    race.sobre?.trim() ||
    race.descricao?.trim() ||
    "Sem descrição cadastrada para este personagem.";

  return (
    <>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-xl light:shadow-xl">
        <div className="relative w-full h-70 md:h-90">
          <div
            style={theme.style}
            className={cn(
              "relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl via-background/40 to-background/20 transition-transform duration-200 ease-in-out hover:scale-105",
              theme.frameClass
            )}
          >
           
            {imageSrc && !imageFailed ? (
              <Image
                src={imageSrc}
                alt={race.nome}
                fill
                className="object-contain h-full mx-auto light:drop-shadow-xl"
                onError={() => setFailedImageSrc(imageSrc)}
              />
            ) : (
              <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border border-[color:var(--theme-chip-border)] bg-[var(--theme-chip-bg)] text-[var(--theme-icon)] shadow-sm backdrop-blur-sm md:h-36 md:w-36">
                <User className="h-14 w-14 md:h-18 md:w-18" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center relative">
          <h2 className="text-4xl font-extrabold tracking-tight mb-2 uppercase">
            {race.nome}
          </h2>

          <p
            title={description}
            className={cn(
              "text-sm text-zinc-450 mb-4 line-clamp-3 leading-relaxed text-justify",
              "text-zinc-400"
            )}
          >
            {description}
          </p>

          <div className="mt-2 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 border border-red-500 rounded-lg p-3 text-center">
                <div className="text-[10px] uppercase text-zinc-400">HP</div>
                <div className="font-semibold dark:text-white text-black">{race.hp_atual ?? "—"}</div>
              </div>

              <div className="bg-white/5 border border-primary rounded-lg p-3 text-center col-span-2">
                <div className="text-[10px] uppercase text-zinc-400">MANA</div>
                <div className="font-semibold dark:text-white text-black">{race.mana_atual ?? "—"}</div>
              </div>
            </div>

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
        </div>
      </div>
    </>
  );
}
