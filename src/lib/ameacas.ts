import type { Prisma } from "@prisma/client";

import {
  type Ameaca,
  type AmeacaElemento,
  type AmeacaGolpe,
  type AmeacaTipo,
} from "@/types/ameaca";
import { prisma } from "@/lib/prisma";

type AmeacaDbRow = {
  slug: string;
  nome: string;
  tipo: string;
  tipoSecundario: string | null;
  elemento: string;
  va: number;
  pv: number;
  mana: number;
  danoBase: string;
  danoMedio: number;
  defesa: number;
  funcao: string;
  reacoes: Prisma.JsonValue;
  fraquezas: Prisma.JsonValue;
  resistencias: Prisma.JsonValue;
  imunidades: Prisma.JsonValue;
  descricao: string;
  narrativa: string;
  golpes: Prisma.JsonValue;
};

export async function listarAmeacas() {
  const ameacas = await prisma.ameaca.findMany({
    orderBy: [{ va: "asc" }, { nome: "asc" }],
  });

  return ameacas.map(toAmeaca);
}

export async function buscarAmeacaPorSlug(slug: string) {
  const ameaca = await prisma.ameaca.findUnique({
    where: { slug },
  });

  return ameaca ? toAmeaca(ameaca) : null;
}

function toAmeaca(ameaca: AmeacaDbRow): Ameaca {
  return {
    id: ameaca.slug,
    nome: ameaca.nome,
    tipo: ameaca.tipo as AmeacaTipo,
    tipoSecundario: ameaca.tipoSecundario ?? undefined,
    elemento: ameaca.elemento as AmeacaElemento,
    va: ameaca.va,
    pv: ameaca.pv,
    mana: ameaca.mana,
    danoBase: ameaca.danoBase,
    danoMedio: ameaca.danoMedio,
    defesa: ameaca.defesa,
    funcao: ameaca.funcao,
    reacoes: toReacoes(ameaca.reacoes),
    fraquezas: toStringArray(ameaca.fraquezas),
    resistencias: toStringArray(ameaca.resistencias),
    imunidades: toStringArray(ameaca.imunidades),
    descricao: ameaca.descricao,
    narrativa: ameaca.narrativa,
    golpes: toGolpes(ameaca.golpes),
  };
}

function toReacoes(value: Prisma.JsonValue): Ameaca["reacoes"] {
  if (!isRecord(value)) {
    return { bloqueio: 0, esquiva: 0, contraAtaque: 0 };
  }

  return {
    bloqueio: toNumber(value.bloqueio),
    esquiva: toNumber(value.esquiva),
    contraAtaque: toNumber(value.contraAtaque),
  };
}

function toGolpes(value: Prisma.JsonValue): AmeacaGolpe[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const nome = toText(item.nome);
    const descricao = toText(item.descricao);

    if (!nome || !descricao) {
      return [];
    }

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

function toStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => toText(item)).filter(Boolean);
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
