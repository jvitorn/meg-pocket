import Image from "next/image";
import Link from "next/link";
import { Compass, ScrollText, Sparkles, Sword } from "lucide-react";
import type { CampanhaInterface } from "@/types";

const steps = [
  {
    icon: Compass,
    title: "1. Escolha seu caminho",
    description:
      "Entre em uma campanha existente ou explore as classes para montar seu estilo de jogo.",
  },
  {
    icon: ScrollText,
    title: "2. Monte sua ficha",
    description:
      "Crie seu personagem com raça, classe e atributos em um fluxo guiado e rápido.",
  },
  {
    icon: Sword,
    title: "3. Entre em ação",
    description:
      "Gerencie magias, recursos e evolução do personagem em tempo real durante a aventura.",
  },
] as const;

interface HomeQuickStartProps {
  featuredCampaigns: CampanhaInterface[];
}

export function HomeQuickStart({ featuredCampaigns }: HomeQuickStartProps) {
  return (
    <section className="bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Como funciona
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Em poucos passos, você escolhe seu estilo, monta a ficha e entra na aventura.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.title}
              className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-yellow-600/40 bg-yellow-600/10 text-yellow-600">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold">Campanhas em destaque</h3>
            <Link
              href="/campanhas"
              className="text-sm font-semibold text-yellow-600 transition hover:text-yellow-500"
            >
              Ver todas
            </Link>
          </div>

          {featuredCampaigns.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {featuredCampaigns.map((campanha) => (
                <Link
                  key={campanha.id}
                  href={`/personagens/campanha/${campanha.id}`}
                  className="group overflow-hidden rounded-2xl border border-border/70 bg-card/70 transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-muted">
                    {campanha.capa ? (
                      <Image
                        src={campanha.capa}
                        alt={`Capa da campanha ${campanha.nome}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        Sem imagem
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>

                  <div className="space-y-2 p-4">
                    <p className="line-clamp-1 text-base font-semibold">
                      {campanha.nome}
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {campanha.sinopse ?? "Aventure-se em uma nova campanha."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {campanha.count_jogadores} jogador(es) • Mestre:{" "}
                      {campanha.mestre}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
              Nenhuma campanha disponível no momento.
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-border/70 bg-gradient-to-r from-yellow-600/10 via-background to-amber-500/10 p-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-xl font-semibold">Próximo passo recomendado</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Entenda as classes rapidamente e comece a criação da ficha do seu personagem.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/classe"
                className="inline-flex items-center gap-2 rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-700"
              >
                <Sparkles className="h-4 w-4" />
                Entender classes
              </Link>
              <Link
                href="/personagens/novo"
                className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:bg-muted"
              >
                Iniciar criação de ficha
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
