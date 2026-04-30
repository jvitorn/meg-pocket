import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import LogoutButton from "./logout-button";
import Link from "next/link";
import { LayoutDashboard, Plus, ScrollText } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import type { Prisma } from "@prisma/client";
import { Toaster } from "@/components/ui/sonner";
import { resolverBaseAtributo } from "@/lib/personagemAtributos";
import { resolverImagemPerfilPersonagem } from "@/lib/personagemImagem";
import { DashboardPersonagemCard } from "@/components/dashboard-personagem-card";
import {
  DashboardCampaignsSection,
  type DashboardCampanhaItem,
} from "@/components/dashboard-campaigns-section";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

type PersonagemListItem = Prisma.PersonagemGetPayload<{
  include: { classe: true; raca: true; campanha: true };
}>;

export default async function DashboardPage() {
  noStore();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const userName = session?.user?.name?.trim();
  const userEmail = session?.user?.email?.trim();
  const campaignFilters: Prisma.CampanhaWhereInput[] = [];

  if (userId) {
    campaignFilters.push({
      user: {
        is: {
          id: userId,
        },
      },
    });
  }

  if (userName) {
    campaignFilters.push({
      user: null,
      mestre: {
        equals: userName,
        mode: "insensitive",
      },
    });
  }

  if (userEmail) {
    campaignFilters.push({
      user: null,
      mestre: {
        equals: userEmail,
        mode: "insensitive",
      },
    });
  }

  const personagens: PersonagemListItem[] = userId
    ? await prisma.personagem.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: {
          classe: true,
          raca: true,
          campanha: true,
        },
      })
    : [];

  const campanhas = campaignFilters.length
    ? await prisma.campanha.findMany({
        where: {
          OR: campaignFilters,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          nome: true,
          sinopse: true,
          capa: true,
          mestre: true,
          tags: true,
          user: {
            select: {
              id: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              personagens: true,
            },
          },
        },
      })
    : [];

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  const campanhasNormalizadas: DashboardCampanhaItem[] = campanhas.map(
    (campanha) => ({
      id: campanha.id,
      nome: campanha.nome,
      sinopse: campanha.sinopse ?? null,
      capa: campanha.capa ?? null,
      mestre: campanha.mestre ?? null,
      tags: Array.isArray(campanha.tags)
        ? campanha.tags.map((tag) => String(tag)).filter(Boolean)
        : [],
      countPersonagens: campanha._count.personagens,
      createdAtLabel: formatter.format(new Date(campanha.createdAt)),
      updatedAtLabel: formatter.format(new Date(campanha.updatedAt)),
      isOwner: campanha.user?.id === userId,
    })
  );

  const totalCampanhas = campanhasNormalizadas.length;
  const totalPersonagens = personagens.length;
  const ultimaAtualizacao =
    personagens[0]?.updatedAt ?? campanhas[0]?.updatedAt ?? null;

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
                { label: "Dashboard" },
              ]}
            />
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Painel do mestre
                </p>
                <h1 className="font-display text-3xl md:text-4xl font-bold">
                  Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-3 max-w-xl">
                  Bem-vindo{session?.user?.name ? "," : ""}{" "}
                  {session?.user?.name ?? "mestre"} — daqui voce acompanha suas
                  campanhas e as fichas mais recentes sem misturar tudo numa
                  unica tela.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button asChild className="gap-2">
                  <Link href="/fichas">
                    <ScrollText className="h-4 w-4" />
                    Ver fichas
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
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

        <section className="max-w-7xl mx-auto px-6 pb-12 space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Campanhas
                  </p>
                  <p className="text-2xl font-semibold">{totalCampanhas}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <ScrollText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Fichas recentes
                  </p>
                  <p className="text-2xl font-semibold">{totalPersonagens}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Ultima atividade
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {ultimaAtualizacao
                  ? formatter.format(new Date(ultimaAtualizacao))
                  : "Sem atividade"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Considera a ficha ou campanha atualizada mais recentemente.
              </p>
            </div>
          </div>

          <DashboardCampaignsSection
            initialCampanhas={campanhasNormalizadas}
            defaultMestre={userName || userEmail || ""}
          />

          <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  Fichas recentes
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Seus ultimos personagens
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Uma visao rapida do que foi atualizado por ultimo, com atalho
                  direto para a lista completa.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/fichas">Abrir todas as fichas</Link>
              </Button>
            </div>

            {personagens.length > 0 ? (
              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {personagens.map((personagem) => {
                  const nome = personagem.nome || "Sem nome";
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

                  return (
                    <DashboardPersonagemCard
                      key={personagem.id}
                      id={personagem.id}
                      nome={nome}
                      detalhe={detalhe}
                      imageSrc={imageSrc}
                      createdAtLabel={formatter.format(new Date(personagem.createdAt))}
                      updatedAtLabel={formatter.format(new Date(personagem.updatedAt))}
                      campanhaNome={personagem.campanha?.nome ?? "Sem campanha"}
                      elemento={personagem.elemento || "sem elemento"}
                      hpAtual={personagem.hp_atual}
                      hpMax={hpMax}
                      manaAtual={personagem.mana_atual}
                      manaMax={manaMax}
                      defesaAtual={personagem.defesa_atual ?? 0}
                      defesaMax={personagem.defesa_max ?? 0}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-background/60 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">
                  Nenhuma ficha criada ainda
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Quando suas fichas nascerem, elas aparecem aqui como atalho
                  rapido para a mesa.
                </p>
                <Button asChild className="mt-5">
                  <Link href="/fichas/novo">Criar ficha</Link>
                </Button>
              </div>
            )}
          </section>
        </section>
      </main>
      <Footer />
    </>
  );
}
