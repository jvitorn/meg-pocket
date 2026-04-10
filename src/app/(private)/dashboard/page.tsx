import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import LogoutButton from "./logout-button";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { Plus } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import type { Prisma } from "@prisma/client";
import { Toaster } from "@/components/ui/sonner";
import { DashboardPersonagemCard } from "@/components/dashboard-personagem-card";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type PersonagemListItem = Prisma.PersonagemGetPayload<{
  include: { classe: true; raca: true };
}>;

export default async function DashboardPage() {
  noStore();
  const session = await getServerSession(authOptions);
  const MAX_PERSONAGENS = 15;
  const userId = session?.user?.id;

  const personagens: PersonagemListItem[] = userId
    ? await prisma.personagem.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: MAX_PERSONAGENS,
        include: {
          classe: true,
          raca: true,
        },
      })
    : [];

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  return (
    <>
      <Navbar />
      <Toaster position="top-right" />
      <main className="min-h-screen bg-background text-foreground">
        <div className="h-1 w-full bg-linear-to-r from-amber-400 via-emerald-400 to-sky-500" />

        <section className="bg-linear-to-b from-muted/40 via-background to-background">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Seu grimório
                </p>
                <h1
                  className={`${cormorant.className} text-3xl md:text-4xl font-bold`}
                >
                  Fichas
                </h1>
                <p className="text-sm text-muted-foreground mt-3 max-w-xl">
                  Bem-vindo{session?.user?.name ? "," : ""}{" "}
                  {session?.user?.name ?? "aventureiro"} — aqui estão as fichas
                  que você já criou e seus próximos passos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button asChild className="gap-2">
                  <Link href="/fichas/novo">
                    <Plus className="h-4 w-4" />
                    Nova Ficha
                  </Link>
                </Button>
                <LogoutButton size="sm" className="w-auto" />
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-12">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="text-sm text-muted-foreground">
              Fichas:{" "}
              <span className="text-foreground font-semibold">
                {personagens.length}
              </span>
              /{MAX_PERSONAGENS}
            </div>
            <div className="text-xs text-muted-foreground">
              {personagens.length >= MAX_PERSONAGENS
                ? "Limite alcançado — arquive um personagem para criar outro."
                : "Você pode criar mais personagens quando quiser."}
            </div>
          </div>

          {personagens.length === 0 ? (
            <div className="flex min-h-[55vh] items-center justify-center">
              <div className="w-full max-w-xl rounded-3xl border border-border/60 bg-card/70 p-10 text-center shadow-sm">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background/80">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold">
                  Nenhum personagem criado
                </h2>
                <p className="text-sm text-muted-foreground mt-3">
                  Crie sua primeira ficha para começar sua jornada em
                  Valthera com estilo.
                </p>
                <Button asChild className="mt-6 px-6">
                  <Link href="/fichas/novo">Criar ficha</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {personagens.map((personagem: PersonagemListItem) => {
                const nome =
                  personagem.apelido?.trim() || personagem.nome || "Sem nome";
                const classe = personagem.classe?.nome ?? null;
                const raca = personagem.raca?.nome ?? null;
                const detalhe =
                  classe && raca
                    ? `${classe} • ${raca}`
                    : classe || raca || "Origem não definida";
                const imageSrc =
                  personagem.url_imagem || personagem.imagem_pixel || "";

                return (
                  <DashboardPersonagemCard
                    key={personagem.id}
                    id={personagem.id}
                    nome={nome}
                    detalhe={detalhe}
                    imageSrc={imageSrc}
                    createdAtLabel={formatter.format(new Date(personagem.createdAt))}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
