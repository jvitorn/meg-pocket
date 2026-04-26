import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { CampanhaEditClient } from "@/components/campanhas/campanha-edit-client";
import { prisma } from "@/lib/prisma";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import { Footer } from "@/components/footer";

function parseCampaignId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function tagsToStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((tag) => String(tag)).filter(Boolean)
    : [];
}

export default async function EditarCampanhaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const { id } = await params;
  const campanhaId = parseCampaignId(id);

  if (!campanhaId) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="text-2xl font-semibold">Campanha inválida</h1>
          <p className="mt-2 text-muted-foreground">
            Esse endereço não aponta para uma campanha válida.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </main>
        <Footer/>
      </>
    );
  }

  const permissao = await validarMestreDaCampanha(campanhaId);

  if (!permissao.ok) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="text-2xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-muted-foreground">{permissao.error}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </main>
      </>
    );
  }

  const [campanha, catalogoItens] = await prisma.$transaction([
    prisma.campanha.findUnique({
      where: { id: campanhaId },
      include: {
        personagens: {
          orderBy: { nome: "asc" },
          include: {
            user: { select: { name: true, email: true } },
            itensInventario: {
              include: { item: true },
              orderBy: [{ esgotadoEm: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
    }),
    prisma.item.findMany({
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, tipo: true },
    }),
  ]);

  if (!campanha) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="text-2xl font-semibold">Campanha não encontrada</h1>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <CampanhaEditClient
        campanha={{
          id: campanha.id,
          nome: campanha.nome,
          sinopse: campanha.sinopse ?? "",
          mestre: campanha.mestre ?? "",
          capa: campanha.capa ?? "",
          tags: tagsToStringArray(campanha.tags),
        }}
        personagens={campanha.personagens.map((personagem) => ({
          id: personagem.id,
          nome: personagem.nome,
          jogador:
            personagem.user?.name ??
            personagem.user?.email ??
            "Jogador não vinculado",
          inventario: personagem.itensInventario.map((entry) => ({
            id: entry.id,
            itemId: entry.itemId,
            nome: entry.item.nome,
            tipo: entry.item.tipo,
            quantidade: entry.quantidade,
            esgotado: Boolean(entry.esgotadoEm) || entry.quantidade === 0,
            observacoes: entry.observacoes ?? "",
          })),
        }))}
        catalogoItens={catalogoItens}
      />
    </>
  );
}
