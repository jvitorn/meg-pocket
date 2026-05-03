import { NextResponse } from "next/server";

import {
  CampanhaCombateError,
  parseCombateId,
  prepararDadosCombate,
} from "@/lib/regras/campanhaCombate";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campanhaId = parseCombateId(id);

    if (!campanhaId) {
      return NextResponse.json(
        { ok: false, error: "ID da campanha inválido." },
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

    const combates = await prisma.combate.findMany({
      where: { campanhaId },
      orderBy: [{ updatedAt: "desc" }, { nome: "asc" }],
      include: {
        _count: { select: { participantes: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      combates: combates.map((combate) => ({
        id: combate.id,
        nome: combate.nome,
        status: combate.status,
        rodadaAtual: combate.rodadaAtual,
        turnoAtual: combate.turnoAtual,
        vaTotal: combate.vaTotal,
        participantesCount: combate._count.participantes,
        createdAt: combate.createdAt.toISOString(),
        startedAt: combate.startedAt?.toISOString() ?? null,
        endedAt: combate.endedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar combates:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao listar combates." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campanhaId = parseCombateId(id);

    if (!campanhaId) {
      return NextResponse.json(
        { ok: false, error: "ID da campanha inválido." },
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
    const [personagens, ameacas] = await Promise.all([
      prisma.personagem.findMany({
        where: { campanhaId },
        select: { id: true, nome: true },
      }),
      prisma.ameaca.findMany({
        select: { id: true, nome: true, va: true, pv: true, mana: true, defesa: true },
      }),
    ]);
    const dados = prepararDadosCombate(body, personagens, ameacas);

    const combate = await prisma.combate.create({
      data: {
        campanhaId,
        nome: dados.nome,
        vaTotal: dados.vaTotal,
        participantes: {
          create: dados.participantes,
        },
      },
      include: {
        _count: { select: { participantes: true } },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        combate: {
          id: combate.id,
          nome: combate.nome,
          status: combate.status,
          rodadaAtual: combate.rodadaAtual,
          turnoAtual: combate.turnoAtual,
          vaTotal: combate.vaTotal,
          participantesCount: combate._count.participantes,
          createdAt: combate.createdAt.toISOString(),
          startedAt: null,
          endedAt: null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CampanhaCombateError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro ao criar combate:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao criar combate." },
      { status: 500 }
    );
  }
}
