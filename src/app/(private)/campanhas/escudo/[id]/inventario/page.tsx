import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { CampanhaInventarioPageClient } from "@/components/campanhas/campanha-inventario-page-client";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";

function parseCampaignId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function CampanhaInventarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const { id } = await params;
  const campanhaId = parseCampaignId(id);

  if (!campanhaId) {
    return <SimpleState title="Campanha inválida" />;
  }

  const permissao = await validarMestreDaCampanha(campanhaId);

  if (!permissao.ok) {
    return <SimpleState title="Acesso restrito" description={permissao.error} />;
  }

  const [campanha, catalogoItens, bestiarioCount] = await prisma.$transaction([
    prisma.campanha.findUnique({
      where: { id: campanhaId },
      include: {
        _count: {
          select: { npcs: true, combates: true },
        },
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
      select: {
        id: true,
        nome: true,
        tipo: true,
        descricao: true,
        durabilidadeBase: true,
        durabilidadeMax: true,
      },
    }),
    prisma.ameaca.count(),
  ]);

  if (!campanha) {
    return <SimpleState title="Campanha não encontrada" />;
  }

  return (
    <CampanhaInventarioPageClient
      campanha={{
        id: campanha.id,
        nome: campanha.nome,
        mestre: campanha.mestre ?? "",
        capa: campanha.capa ?? "",
        sinopse: campanha.sinopse ?? "",
        status: campanha.status,
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
          descricao: entry.item.descricao,
          durabilidadeAtual: entry.durabilidadeAtual,
          durabilidadeMax: entry.durabilidadeMax,
          quantidade: entry.quantidade,
          esgotado: Boolean(entry.esgotadoEm) || entry.quantidade === 0,
          observacoes: entry.observacoes ?? "",
        })),
      }))}
      catalogoItens={catalogoItens}
      npcsCount={campanha._count.npcs}
      combatesCount={campanha._count.combates}
      bestiarioCount={bestiarioCount}
    />
  );
}

function SimpleState({
  title,
  description,
}: {
  title: string;
  description?: string | null;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
      <Button asChild className="mt-6">
        <Link href="/dashboard">Voltar ao dashboard</Link>
      </Button>
    </main>
  );
}
