import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverBaseAtributo } from "@/lib/personagemAtributos";
import { resolverImagemPerfilPersonagem } from "@/lib/personagemImagem";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";
import LogoutButton from "@/app/(private)/dashboard/logout-button";
import {
  DashboardPersonagensGrid,
  type DashboardPersonagemGridItem,
} from "@/components/dashboard-personagens-grid";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

type PersonagemListItem = Prisma.PersonagemGetPayload<{
  include: { classe: true; raca: true; campanha: true };
}>;

export default async function FichasPage() {
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
          campanha: true,
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
            <AppBreadcrumb
              items={[
                { label: "Início", href: "/" },
                { label: "Fichas" },
              ]}
            />
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Seu grimorio
                </p>
                <h1 className="font-display text-3xl md:text-4xl font-bold">
                  Fichas
                </h1>
                <p className="text-sm text-muted-foreground mt-3 max-w-xl">
                  Bem-vindo{session?.user?.name ? "," : ""}{" "}
                  {session?.user?.name ?? "aventureiro"} — aqui estao as fichas
                  que voce ja criou e seus proximos passos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button asChild className="gap-2">
                  <Link href="/fichas/novo">
                    <Plus className="h-4 w-4" />
                    Nova ficha
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
                ? "Limite alcancado — arquive um personagem para criar outro."
                : "Voce pode criar mais personagens quando quiser."}
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
                  Crie sua primeira ficha para comecar sua jornada em Valthera
                  com estilo.
                </p>
                <Button asChild className="mt-6 px-6">
                  <Link href="/fichas/novo">Criar ficha</Link>
                </Button>
              </div>
            </div>
          ) : (
            <DashboardPersonagensGrid
              personagens={personagens.map(
                (personagem: PersonagemListItem): DashboardPersonagemGridItem => {
                  const nome =
                    personagem.apelido?.trim() || personagem.nome || "Sem nome";
                  const classe = personagem.classe?.nome ?? null;
                  const raca = personagem.raca?.nome ?? null;
                  const detalhe =
                    classe && raca
                      ? `${classe} • ${raca}`
                      : classe || raca || "Origem nao definida";
                  const imageSrc = resolverImagemPerfilPersonagem(personagem);
                  const hpMax = resolverBaseAtributo({
                    basePersistida: personagem.hp_base,
                    baseDerivada:
                      (personagem.raca?.hp ?? 0) + (personagem.classe?.hp ?? 0),
                  });
                  const manaMax = resolverBaseAtributo({
                    basePersistida: personagem.mana_base,
                    baseDerivada:
                      (personagem.raca?.mana ?? 0) +
                      (personagem.classe?.mana ?? 0),
                  });

                  return {
                    id: personagem.id,
                    nome,
                    detalhe,
                    imageSrc,
                    createdAtLabel: formatter.format(new Date(personagem.createdAt)),
                    updatedAtLabel: formatter.format(new Date(personagem.updatedAt)),
                    campanhaNome: personagem.campanha?.nome ?? "Sem campanha",
                    classeNome: classe ?? "",
                    racaNome: raca ?? "",
                    elemento: personagem.elemento || "sem elemento",
                    hpAtual: personagem.hp_atual,
                    hpMax,
                    manaAtual: personagem.mana_atual,
                    manaMax,
                    defesaAtual: personagem.defesa_atual ?? 0,
                    defesaMax: personagem.defesa_max ?? 0,
                  };
                }
              )}
            />
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
