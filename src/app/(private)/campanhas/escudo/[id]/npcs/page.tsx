import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { CampanhaNpcsPageClient } from "@/components/campanhas/campanha-npcs-page-client";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import {
  getNpcCampanhaLimit,
  isClasseNpcSelecionavel,
} from "@/lib/regras/campanhaNpc";

function parseCampaignId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function CampanhaNpcsPage({
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

  const [campanha, racas, classes, estilosNarrativos] = await prisma.$transaction([
    prisma.campanha.findUnique({
      where: { id: campanhaId },
      include: {
        _count: {
          select: { combates: true },
        },
        personagens: {
          select: {
            id: true,
            itensInventario: {
              select: { quantidade: true },
            },
          },
        },
        npcs: {
          orderBy: [{ updatedAt: "desc" }, { nome: "asc" }],
        },
      },
    }),
    prisma.raca.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.classe.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.npcEstiloNarrativo.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: {
        chave: true,
        nome: true,
        descricao: true,
      },
    }),
  ]);

  if (!campanha) {
    return <SimpleState title="Campanha não encontrada" />;
  }

  const inventarioCount = campanha.personagens.reduce(
    (total, personagem) =>
      total +
      personagem.itensInventario.reduce(
        (personagemTotal, item) => personagemTotal + item.quantidade,
        0
      ),
    0
  );

  return (
    <CampanhaNpcsPageClient
      campanha={{
        id: campanha.id,
        nome: campanha.nome,
        mestre: campanha.mestre ?? "",
        capa: campanha.capa ?? "",
        sinopse: campanha.sinopse ?? "",
      }}
      npcs={campanha.npcs.map((npc) => ({
        id: npc.id,
        nome: npc.nome,
        racaId: npc.racaId,
        racaNome: npc.racaNome,
        genero: npc.genero,
        classeId: npc.classeId,
        classeNome: npc.classeNome,
        profissao: npc.profissao,
        importancia: npc.importancia,
        tom: npc.tom,
        personalidade: npc.personalidade,
        aparencia: npc.aparencia,
        segredo: npc.segredo,
        objetivoCampanha: npc.objetivoCampanha,
        gancho: npc.gancho,
        frase: npc.frase,
        relacaoComGrupo: npc.relacaoComGrupo,
        detalheVisual: npc.detalheVisual,
        descricao: npc.descricao,
        dadosJson: npc.dadosJson,
      }))}
      racas={racas}
      classes={classes.filter((classe) => isClasseNpcSelecionavel(classe.nome))}
      estilosNarrativos={estilosNarrativos}
      limite={getNpcCampanhaLimit()}
      personagensCount={campanha.personagens.length}
      inventarioCount={inventarioCount}
      combatesCount={campanha._count.combates}
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
