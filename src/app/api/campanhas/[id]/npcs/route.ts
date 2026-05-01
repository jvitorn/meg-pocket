import { NextResponse } from "next/server";

import {
  NpcCampanhaError,
  getNpcCampanhaLimit,
  prepararDadosNpcCampanha,
} from "@/lib/regras/campanhaNpc";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import { prisma } from "@/lib/prisma";

function parseCampaignId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campanhaId = parseCampaignId(id);

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

    const npcs = await prisma.campanhaNpc.findMany({
      where: { campanhaId },
      orderBy: [{ updatedAt: "desc" }, { nome: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      npcs,
      limite: getNpcCampanhaLimit(),
    });
  } catch (error) {
    console.error("Erro ao listar NPCs da campanha:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao listar NPCs." },
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
    const campanhaId = parseCampaignId(id);

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
    const dados = await prepararDadosNpcCampanha(body);
    const limite = getNpcCampanhaLimit();

    const npc = await prisma.$transaction(async (tx) => {
      const total = await tx.campanhaNpc.count({ where: { campanhaId } });

      if (total >= limite) {
        throw new NpcCampanhaError(
          `Esta campanha já atingiu o limite de ${limite} NPCs salvos.`,
          400
        );
      }

      return tx.campanhaNpc.create({
        data: {
          ...dados,
          campanhaId,
          criadoPor: permissao.userId,
        },
      });
    });

    return NextResponse.json({ ok: true, npc }, { status: 201 });
  } catch (error) {
    if (error instanceof NpcCampanhaError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro ao salvar NPC da campanha:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao salvar NPC." },
      { status: 500 }
    );
  }
}
