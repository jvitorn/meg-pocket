"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";

interface HomeFaqProps {
  isAuthenticated: boolean;
}

const faqItems = [
  {
    id: "create-before-campaign",
    question: "Preciso criar personagem antes de entrar em uma campanha?",
    answer:
      "Sim. Primeiro, crie sua ficha para definir classe, raça, atributos e recursos. Depois disso, você entra na campanha já pronto para jogar.",
  },
  {
    id: "edit-character-sheet",
    question: "Posso editar minha ficha depois de criada?",
    answer:
      "Sim. A ficha é dinâmica e pode ser atualizada ao longo da jornada. Porém, algumas escolhas iniciais não podem ser alteradas depois, como classe e raça, então vale preencher essa etapa com atenção.",
  },
  {
    id: "available-classes",
    question: "Quais classes estão disponíveis no momento?",
    answer:
      "Você pode explorar classes como Guerreiro, Purificador, Artífice e Elementalista. Para saber mais sobre cada uma, acesse a seção de classes.",
  },
  {
    id: "gm-panel",
    question: "Existe um painel de mestre da campanha?",
    answer:
      "Ainda não nesta versão. Estamos desenvolvendo um painel de mestre e a ideia é disponibilizar essa funcionalidade em breve.",
  },
] as const;

export function HomeFaq({ isAuthenticated }: HomeFaqProps) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  return (
    <section className="relative isolate overflow-hidden px-6 py-16 text-white">
      <Image
        src="/imgs/backgrounds/faq.jpg"
        alt="Biblioteca arcana para seção de perguntas frequentes"
        fill
        sizes="100vw"
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/70 to-black/80" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-yellow-600/60 bg-yellow-600/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-yellow-400">
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            FAQ Rápido
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Dúvidas comuns antes de começar
          </h2>
          <p className="mt-3 text-base text-white/80 md:text-lg">
            Respostas curtas para você entrar no jogo com confiança.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border bg-black/45 p-5 backdrop-blur-sm transition ${
                openItemId === item.id
                  ? "border-yellow-500/50 bg-black/55"
                  : "border-white/20"
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenItemId((prev) => (prev === item.id ? null : item.id))
                }
                aria-expanded={openItemId === item.id}
                className="w-full cursor-pointer text-left text-base font-semibold"
              >
                {item.question}
              </button>
              {openItemId === item.id ? (
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  {item.answer}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/classe"
            className="inline-flex items-center rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-700"
          >
            Ver classes
          </Link>
          <Link
            href={isAuthenticated ? "/personagens/novo" : "/cadastro"}
            className="inline-flex items-center rounded-md border border-white/35 bg-black/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {isAuthenticated ? "Criar ficha" : "Criar conta"}
          </Link>
        </div>
      </div>
    </section>
  );
}
