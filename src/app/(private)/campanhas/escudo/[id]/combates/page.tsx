import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import type { Prisma } from "@prisma/client";

import { CampanhaCombatesPageClient } from "@/components/campanhas/campanha-combates-page-client";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { resolverBaseAtributo } from "@/lib/personagemAtributos";
import {
  parseCombateId,
  toJsonArray,
  toJsonRecord,
} from "@/lib/regras/campanhaCombate";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import type {
  CombateParticipanteView,
  MagiaPersonagem,
} from "@/types";

export default async function CampanhaCombatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const { id } = await params;
  const campanhaId = parseCombateId(id);

  if (!campanhaId) {
    return <SimpleState title="Campanha inválida" />;
  }

  const permissao = await validarMestreDaCampanha(campanhaId);

  if (!permissao.ok) {
    return <SimpleState title="Acesso restrito" description={permissao.error} />;
  }

  const [campanha, ameacas] = await prisma.$transaction([
    prisma.campanha.findUnique({
      where: { id: campanhaId },
      include: {
        personagens: {
          orderBy: { nome: "asc" },
          include: {
            raca: { select: { nome: true, hp: true, mana: true } },
            classe: { select: { nome: true, hp: true, mana: true } },
            itensInventario: { select: { quantidade: true } },
          },
        },
        npcs: { select: { id: true } },
        combates: {
          orderBy: [{ updatedAt: "desc" }, { nome: "asc" }],
          include: {
            participantes: {
              orderBy: [{ ordem: "asc" }, { nome: "asc" }],
              include: {
                personagem: {
                  include: {
                    raca: { select: { nome: true, hp: true, mana: true } },
                    classe: { select: { nome: true, hp: true, mana: true } },
                    slotsDefensivos: true,
                    magiaPersonagem: { include: { magia: true } },
                  },
                },
                ameaca: true,
              },
            },
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
    <CampanhaCombatesPageClient
      campanha={{
        id: campanha.id,
        nome: campanha.nome,
        mestre: campanha.mestre ?? "",
        capa: campanha.capa ?? "",
        sinopse: campanha.sinopse ?? "",
      }}
      combates={campanha.combates.map((combate) => ({
        id: combate.id,
        nome: combate.nome,
        status: combate.status,
        rodadaAtual: combate.rodadaAtual,
        turnoAtual: combate.turnoAtual,
        vaTotal: combate.vaTotal,
        participantesCount: combate.participantes.length,
        createdAt: combate.createdAt.toISOString(),
        startedAt: combate.startedAt?.toISOString() ?? null,
        endedAt: combate.endedAt?.toISOString() ?? null,
        participantes: combate.participantes.map(toParticipanteView),
      }))}
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
          baseDerivada:
            (personagem.raca?.mana ?? 0) + (personagem.classe?.mana ?? 0),
        }),
      }))}
      ameacas={ameacas.map((ameaca) => ({
        ...ameaca,
        reacoes: parseReacoes(ameaca.reacoes),
        golpes: parseGolpes(ameaca.golpes),
      }))}
      personagensCount={campanha.personagens.length}
      inventarioCount={inventarioCount}
      npcsCount={campanha.npcs.length}
      bestiarioCount={ameacas.length}
    />
  );
}

type ParticipanteWithDetails = Prisma.CombateParticipanteGetPayload<{
  include: {
    personagem: {
      include: {
        raca: { select: { nome: true; hp: true; mana: true } };
        classe: { select: { nome: true; hp: true; mana: true } };
        slotsDefensivos: true;
        magiaPersonagem: { include: { magia: true } };
      };
    };
    ameaca: true;
  };
}>;

function toParticipanteView(
  participante: ParticipanteWithDetails
): CombateParticipanteView {
  if (participante.tipo === "AMEACA") {
    const ameaca = participante.ameaca;

    return {
      id: participante.id,
      tipo: "AMEACA",
      nome: participante.nome,
      iniciativa: participante.iniciativa,
      ordem: participante.ordem,
      hp: participante.hpAtual ?? ameaca?.pv ?? null,
      mana: participante.manaAtual ?? ameaca?.mana ?? null,
      defesa: ameaca?.defesa ?? null,
      detalhe: {
        tipo: "AMEACA",
        funcao: ameaca?.funcao ?? null,
        va: ameaca?.va ?? null,
        hpMax: ameaca?.pv ?? 0,
        manaMax: ameaca?.mana ?? 0,
        reacoes: parseReacoes(ameaca?.reacoes),
        reacoesUsadas: {
          bloqueio: participante.bloqueioUsado,
          esquiva: participante.esquivaUsada,
          contraAtaque: participante.contraAtaqueUsado,
        },
        golpes: parseGolpes(ameaca?.golpes),
      },
    };
  }

  const personagem = participante.personagem;
  const hp = personagem
    ? resolverBaseAtributo({
        basePersistida: personagem.hp_base,
        baseDerivada:
          (personagem.raca?.hp ?? 0) + (personagem.classe?.hp ?? 0),
      })
    : null;
  const mana = personagem
    ? resolverBaseAtributo({
        basePersistida: personagem.mana_base,
        baseDerivada:
          (personagem.raca?.mana ?? 0) + (personagem.classe?.mana ?? 0),
      })
    : null;

  return {
    id: participante.id,
    tipo: "PERSONAGEM",
    nome: participante.nome,
    iniciativa: participante.iniciativa,
    ordem: participante.ordem,
    hp: personagem?.hp_atual ?? hp,
    mana: personagem?.mana_atual ?? mana,
    defesa: personagem?.defesa_atual ?? null,
    detalhe: {
      tipo: "PERSONAGEM",
      classeNome: personagem?.classe?.nome ?? null,
      racaNome: personagem?.raca?.nome ?? null,
      magias:
        personagem?.magiaPersonagem.map((magiaPersonagem) => {
          const magia = magiaPersonagem.magia;
          return {
            nome: magia?.nome ?? "",
            alcance: magia?.alcance ?? magiaPersonagem.descricao ?? "",
            descricao:
              magiaPersonagem.descricao ?? magia?.descricao ?? "",
            custo_nivel:
              magiaPersonagem.custo_nivel ?? magia?.custo_nivel ?? 0,
          };
        }).filter((magia): magia is MagiaPersonagem => Boolean(magia.nome)) ??
        [],
      slotsDefensivos: personagem?.slotsDefensivos
        ? {
            esquivaUsada: personagem.slotsDefensivos.esquivaUsada,
            bloqueioUsado: personagem.slotsDefensivos.bloqueioUsado,
            contraAtaqueUsado:
              personagem.slotsDefensivos.contraAtaqueUsado,
          }
        : null,
    },
  };
}

function parseReacoes(value: Prisma.JsonValue | null | undefined) {
  const record = value ? toJsonRecord(value) : {};
  return {
    bloqueio: toNumber(record.bloqueio),
    esquiva: toNumber(record.esquiva),
    contraAtaque: toNumber(record.contraAtaque),
  };
}

function parseGolpes(value: Prisma.JsonValue | null | undefined) {
  return (value ? toJsonArray(value) : []).flatMap((item) => {
    if (!isRecord(item)) return [];
    const nome = toText(item.nome);
    const descricao = toText(item.descricao);

    if (!nome || !descricao) return [];

    return {
      nome,
      descricao,
      dano: toText(item.dano) || undefined,
      custoMana: Number.isFinite(Number(item.custoMana))
        ? Number(item.custoMana)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
