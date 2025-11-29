
'use client';

import Image from "next/image";
import LogoGuerreiro from "@/components/icons/guerreiro";

type ParamsLike = { id: string } | Promise<{ id: string }>;

export default async function ClassePage({ params }: { params: ParamsLike }) {
  const { id } = await params;

  const mock = {
    nome: "Guerreiro",
    subtitulo: "Combatente",
    background: `/imgs/backgrounds/classe_guerreiro.jpg`,
    img_corpo:
      "https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/background/guerreiro.png",
    exemploPersonagem: "Ragnar Forja",
    sobre:
      "Guerreiros são especialistas da linha de frente, capazes de aguentar castigo pesado e devolver golpes devastadores. São treinados desde cedo em disciplina militar, combate direto e domínio do campo de batalha. Sua presença inspira aliados e intimida inimigos.",
    gameplay:
      "O Guerreiro é focado em combate direto. Ele mantém ameaças sob controle, protege aliados mais frágeis e pressiona o inimigo com ataques físicos constantes. Seu estilo premia jogadores agressivos, que se posicionam bem e sabem quando trocar defesa por dano.",
    hp_base: 14,
    mana_base: 4,
    tags: ["Corpo a Corpo", "Tanque", "Alta Resistência", "Iniciante-Friendly"],
    habilidades_placeholder: Array.from({ length: 6 }).map((_, i) => ({
      nome: `Habilidade ${i + 1}`,
      descricao: "Descrição resumida da habilidade.",
      custo: 0,
    })),
  };

  return (
    <>
      <main className="w-full bg-background text-foreground">
        {/* HERO */}
        <section className="relative w-full h-[60vh] md:h-[72vh] flex items-end justify-center">
          <Image
            src={mock.background}
            alt="Background classe"
            fill
            priority
            unoptimized
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/40 to-transparent" />

          <div className="relative z-20 pb-24 text-center text-gray-100 drop-shadow-xl">
            <LogoGuerreiro className="w-20 h-20 mx-auto text-red-400" />

            <h1 className="mt-4 text-5xl md:text-7xl font-extrabold tracking-wide uppercase">
              {mock.nome}
            </h1>

            <p className="mt-2 text-lg md:text-xl opacity-90">
              {mock.subtitulo}
            </p>
          </div>
        </section>

        {/* SEÇÃO PRINCIPAL */}
        <section className="relative -mt-20 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            {/* Full-body — coluna direita */}
            <div className="md:col-span-5 relative flex flex-col items-center order-1 md:order-2">
              <img
                src={mock.img_corpo}
                alt={`${mock.nome} full body`}
                className="max-h-[520px] object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.6)]"
              />
              <span className="mt-3 text-xs text-muted-foreground">
                Arte de referência — Ragnar Forja.
              </span>
            </div>

            {/* COLUNA TEXTO — esquerda: Card cortado até TAGS no desktop */}
            <div className="md:col-span-7 order-2 md:order-1">
              {/* Título secundário */}
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight text-white">
                {mock.nome}
              </h2>

              {/* CARD PRINCIPAL (até as TAGS) */}
              <div className="bg-white/90 dark:bg-transparent backdrop-blur-sm md:shadow-lg md:rounded-lg md:p-7 md:border md:border-gray-300 dark:border-primary">
                {/* SOBRE */}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                  Sobre
                </h3>
                <p className="leading-relaxed text-[15px] text-foreground/90">
                  {mock.sobre}
                </p>

                {/* GAMEPLAY */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                    Gameplay
                  </h3>
                  <p className="leading-relaxed text-[15px] text-foreground/90">
                    {mock.gameplay}
                  </p>
                </div>

                {/* ATRIBUTOS BASE */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700 text-center">
                    <div className="text-xs text-muted-foreground uppercase">
                      HP Base
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      {mock.hp_base}
                    </div>
                  </div>

                  <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700 text-center">
                    <div className="text-xs text-muted-foreground uppercase">
                      Mana Base
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      {mock.mana_base}
                    </div>
                  </div>
                </div>

                {/* TAGS */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                    Tags
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {mock.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-xs rounded-full bg-gray-200 dark:bg-slate-800 border border-gray-300 dark:border-gray-700 text-foreground/90"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            {/* ---------------------------
                  Agora fechamos o painel e mostramos
                  "Exemplo de personagem" e "Habilidades"
                  fora do card, com largura e espaçamento melhores.
                 --------------------------- */}
            <div className="col-span-12 order-2 md:order-1 mt-8">
              {/* Exemplo de personagem — ocupa toda a largura do conteúdo (desktop) */}
              <div className="bg-white/80 dark:bg-slate-900/70 rounded-lg p-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                  Exemplo de personagem
                </h4>
                <div className="bg-gray-100 dark:bg-slate-800 rounded-md px-4 py-3">
                  <span className="text-foreground font-semibold">
                    {mock.exemploPersonagem}
                  </span>
                </div>
              </div>

              {/* Combate e Magias — também em bloco separado */}
              <div className="mt-6 bg-white/80 dark:bg-slate-900/70 rounded-lg p-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                  Combate e Magias
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mock.habilidades_placeholder.map((h, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <div className="font-semibold text-sm">{h.nome}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {h.descricao}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="h-24" />
      </main>
    </>
  );
}
