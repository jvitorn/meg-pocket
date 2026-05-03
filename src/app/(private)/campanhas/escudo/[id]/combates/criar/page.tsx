import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import type { Prisma } from "@prisma/client";

import { CampanhaCombateCreatePageClient } from "@/components/campanhas/campanha-combate-create-page-client";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { resolverBaseAtributo } from "@/lib/personagemAtributos";
import { parseCombateId, toJsonArray, toJsonRecord } from "@/lib/regras/campanhaCombate";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";

export default async function CampanhaCombateCriarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const { id } = await params;
  const campanhaId = parseCombateId(id);

  if (!campanhaId) return <SimpleState title="Campanha inválida" />;

  const permissao = await validarMestreDaCampanha(campanhaId);
  if (!permissao.ok) {
    return <SimpleState title="Acesso restrito" description={permissao.error} />;
  }

  const [campanha, ameacas] = await prisma.$transaction([
    prisma.campanha.findUnique({
      where: { id: campanhaId },
      include: {
        _count: { select: { combates: true, npcs: true } },
        personagens: {
          orderBy: { nome: "asc" },
          include: {
            raca: { select: { nome: true, hp: true, mana: true } },
            classe: { select: { nome: true, hp: true, mana: true } },
            itensInventario: { select: { quantidade: true } },
          },
        },
      },
    }),
    prisma.ameaca.findMany({
      orderBy: [{ va: "asc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        slug: true,
        tipo: true,
        elemento: true,
        funcao: true,
        va: true,
        pv: true,
        mana: true,
        defesa: true,
        danoBase: true,
        danoMedio: true,
        descricao: true,
        golpes: true,
        reacoes: true,
      },
    }),
  ]);

  if (!campanha) return <SimpleState title="Campanha não encontrada" />;

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
    <CampanhaCombateCreatePageClient
      campanha={{
        id: campanha.id,
        nome: campanha.nome,
        mestre: campanha.mestre ?? "",
        capa: campanha.capa ?? "",
        sinopse: campanha.sinopse ?? "",
      }}
      personagens={campanha.personagens.map((personagem) => ({
        id: personagem.id,
        nome: personagem.nome,
        classeNome: personagem.classe?.nome ?? null,
        racaNome: personagem.raca?.nome ?? null,
        hp: resolverBaseAtributo({
          basePersistida: personagem.hp_base,
          baseDerivada: (personagem.raca?.hp ?? 0) + (personagem.classe?.hp ?? 0),
        }),
        mana: resolverBaseAtributo({
          basePersistida: personagem.mana_base,
          baseDerivada: (personagem.raca?.mana ?? 0) + (personagem.classe?.mana ?? 0),
        }),
      }))}
      ameacas={ameacas.map((ameaca) => ({
        ...ameaca,
        reacoes: parseReacoes(ameaca.reacoes),
        golpes: parseGolpes(ameaca.golpes),
      }))}
      personagensCount={campanha.personagens.length}
      inventarioCount={inventarioCount}
      npcsCount={campanha._count.npcs}
      combatesCount={campanha._count.combates}
    />
  );
}

function parseReacoes(value: Prisma.JsonValue) {
  const record = toJsonRecord(value);
  return {
    bloqueio: toNumber(record.bloqueio),
    esquiva: toNumber(record.esquiva),
    contraAtaque: toNumber(record.contraAtaque),
  };
}

function parseGolpes(value: Prisma.JsonValue) {
  return toJsonArray(value).flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const nome = toText(record.nome);
    const descricao = toText(record.descricao);
    if (!nome || !descricao) return [];
    return {
      nome,
      descricao,
      dano: toText(record.dano) || undefined,
      custoMana: Number.isFinite(Number(record.custoMana))
        ? Number(record.custoMana)
        : undefined,
    };
  });
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
