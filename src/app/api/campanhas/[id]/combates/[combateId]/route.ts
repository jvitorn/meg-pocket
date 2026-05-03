import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import {
  CampanhaCombateError,
  ordenarParticipantes,
  parseCombateId,
  prepararAcaoCombate,
  prepararAtualizacaoAmeacaCombate,
  prepararReacaoAmeacaCombate,
  resolverProximoTurno,
  resolverTurnoAnterior,
} from "@/lib/regras/campanhaCombate";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string; combateId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id, combateId } = await params;
    const campanhaId = parseCombateId(id);
    const parsedCombateId = parseCombateId(combateId);

    if (!campanhaId || !parsedCombateId) {
      return NextResponse.json(
        { ok: false, error: "ID inválido." },
        { status: 400 }
      );
    }

    const permissao = await validarMestreDaCampanha(campanhaId);
    if (!permissao.ok) {
      return NextResponse.json(
        { ok: false, error: permissao.error },
        { status: permissao.status }
      );
    }

    const combate = await prisma.combate.findFirst({
      where: { id: parsedCombateId, campanhaId },
      include: {
        participantes: {
          orderBy: [{ ordem: "asc" }, { nome: "asc" }],
          include: {
            personagem: {
              include: {
                raca: { select: { nome: true } },
                classe: { select: { nome: true } },
                slotsDefensivos: true,
                magiaPersonagem: { include: { magia: true } },
              },
            },
            ameaca: true,
          },
        },
      },
    });

    if (!combate) {
      return NextResponse.json(
        { ok: false, error: "Combate não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, combate });
  } catch (error) {
    console.error("Erro ao buscar combate:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao buscar combate." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, combateId } = await params;
    const campanhaId = parseCombateId(id);
    const parsedCombateId = parseCombateId(combateId);

    if (!campanhaId || !parsedCombateId) {
      return NextResponse.json(
        { ok: false, error: "ID inválido." },
        { status: 400 }
      );
    }

    const permissao = await validarMestreDaCampanha(campanhaId);
    if (!permissao.ok) {
      return NextResponse.json(
        { ok: false, error: permissao.error },
        { status: permissao.status }
      );
    }

    const body = await request.json();
    const { action } = prepararAcaoCombate(body);

    if (action === "atualizar_ameaca") {
      const { participanteId, hpAtual, manaAtual } =
        prepararAtualizacaoAmeacaCombate(body);
      const participante = await prisma.combateParticipante.findFirst({
        where: {
          id: participanteId,
          combateId: parsedCombateId,
          tipo: "AMEACA",
          combate: { campanhaId },
        },
        select: { id: true },
      });

      if (!participante) {
        return NextResponse.json(
          { ok: false, error: "Ameaça do combate não encontrada." },
          { status: 404 }
        );
      }

      await prisma.combateParticipante.update({
        where: { id: participante.id },
        data: { hpAtual, manaAtual },
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "usar_reacao_ameaca" || action === "resetar_reacoes_ameaca") {
      const { participanteId, tipo } =
        action === "usar_reacao_ameaca"
          ? prepararReacaoAmeacaCombate(body)
          : { ...prepararAtualizacaoParticipanteId(body), tipo: null };
      const participante = await prisma.combateParticipante.findFirst({
        where: {
          id: participanteId,
          combateId: parsedCombateId,
          tipo: "AMEACA",
          combate: { campanhaId },
        },
        include: { ameaca: true },
      });

      if (!participante) {
        return NextResponse.json(
          { ok: false, error: "Ameaça do combate não encontrada." },
          { status: 404 }
        );
      }

      if (action === "resetar_reacoes_ameaca") {
        await prisma.combateParticipante.update({
          where: { id: participante.id },
          data: {
            bloqueioUsado: 0,
            esquivaUsada: 0,
            contraAtaqueUsado: 0,
          },
        });
        return NextResponse.json({ ok: true });
      }

      const reacoes = parseReacoes(participante.ameaca?.reacoes);
      const usedField =
        tipo === "bloqueio"
          ? "bloqueioUsado"
          : tipo === "esquiva"
            ? "esquivaUsada"
            : "contraAtaqueUsado";
      const limite =
        tipo === "bloqueio"
          ? reacoes.bloqueio
          : tipo === "esquiva"
            ? reacoes.esquiva
            : reacoes.contraAtaque;

      if (participante[usedField] >= limite) {
        throw new CampanhaCombateError("Limite de uso atingido para esta reação.");
      }

      await prisma.combateParticipante.update({
        where: { id: participante.id },
        data: { [usedField]: { increment: 1 } },
      });

      return NextResponse.json({ ok: true });
    }

    const combate = await prisma.combate.findFirst({
      where: { id: parsedCombateId, campanhaId },
      include: {
        participantes: {
          orderBy: [{ ordem: "asc" }, { nome: "asc" }],
          select: { id: true, nome: true, iniciativa: true },
        },
      },
    });

    if (!combate) {
      return NextResponse.json(
        { ok: false, error: "Combate não encontrado." },
        { status: 404 }
      );
    }

    if (action === "iniciar") {
      if (combate.status === "ENCERRADO") {
        throw new CampanhaCombateError("Combates encerrados não podem ser iniciados.");
      }

      if (combate.participantes.length === 0) {
        throw new CampanhaCombateError("Combate sem participantes.");
      }

      const ordered = ordenarParticipantes(combate.participantes);
      await prisma.$transaction([
        ...ordered.map((participante, ordem) =>
          prisma.combateParticipante.update({
            where: { id: participante.id },
            data: { ordem },
          })
        ),
        prisma.combate.update({
          where: { id: combate.id },
          data: {
            status: "EM_ANDAMENTO",
            rodadaAtual: 1,
            turnoAtual: 0,
            startedAt: combate.startedAt ?? new Date(),
            endedAt: null,
          },
        }),
      ]);
    }

    if (action === "proximo" || action === "voltar") {
      if (combate.status !== "EM_ANDAMENTO") {
        throw new CampanhaCombateError(
          "A navegação de turnos exige um combate em andamento."
        );
      }

      const nextState =
        action === "proximo"
          ? resolverProximoTurno({
              turnoAtual: combate.turnoAtual,
              rodadaAtual: combate.rodadaAtual,
              totalParticipantes: combate.participantes.length,
            })
          : resolverTurnoAnterior({
              turnoAtual: combate.turnoAtual,
              rodadaAtual: combate.rodadaAtual,
              totalParticipantes: combate.participantes.length,
            });

      await prisma.combate.update({
        where: { id: combate.id },
        data: nextState,
      });
    }

    if (action === "encerrar") {
      if (combate.status === "ENCERRADO") {
        throw new CampanhaCombateError("Este combate já está encerrado.");
      }

      await prisma.combate.update({
        where: { id: combate.id },
        data: {
          status: "ENCERRADO",
          endedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CampanhaCombateError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro ao atualizar combate:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao atualizar combate." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id, combateId } = await params;
    const campanhaId = parseCombateId(id);
    const parsedCombateId = parseCombateId(combateId);

    if (!campanhaId || !parsedCombateId) {
      return NextResponse.json(
        { ok: false, error: "ID inválido." },
        { status: 400 }
      );
    }

    const permissao = await validarMestreDaCampanha(campanhaId);
    if (!permissao.ok) {
      return NextResponse.json(
        { ok: false, error: permissao.error },
        { status: permissao.status }
      );
    }

    const combate = await prisma.combate.findFirst({
      where: { id: parsedCombateId, campanhaId },
      select: { id: true },
    });

    if (!combate) {
      return NextResponse.json(
        { ok: false, error: "Combate não encontrado." },
        { status: 404 }
      );
    }

    await prisma.combate.delete({ where: { id: combate.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir combate:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao excluir combate." },
      { status: 500 }
    );
  }
}

function prepararAtualizacaoParticipanteId(body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new CampanhaCombateError("Participante inválido.");
  }

  const participanteId = Number((body as Record<string, unknown>).participanteId);
  if (!Number.isInteger(participanteId) || participanteId <= 0) {
    throw new CampanhaCombateError("Participante inválido.");
  }

  return { participanteId };
}

function parseReacoes(value: Prisma.JsonValue | null | undefined) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { bloqueio: 0, esquiva: 0, contraAtaque: 0 };
  }

  const record = value as Record<string, unknown>;
  return {
    bloqueio: toNumber(record.bloqueio),
    esquiva: toNumber(record.esquiva),
    contraAtaque: toNumber(record.contraAtaque),
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
