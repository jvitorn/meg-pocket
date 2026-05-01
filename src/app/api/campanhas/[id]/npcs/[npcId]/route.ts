import { NextResponse } from "next/server";

import {
  NpcCampanhaError,
  prepararDadosNpcCampanha,
} from "@/lib/regras/campanhaNpc";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import { prisma } from "@/lib/prisma";

function parsePositive(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function findNpcInCampaign(npcId: number, campanhaId: number) {
  return prisma.campanhaNpc.findFirst({
    where: { id: npcId, campanhaId },
    select: { id: true },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; npcId: string }> }
) {
  try {
    const { id, npcId } = await params;
    const campanhaId = parsePositive(id);
    const campanhaNpcId = parsePositive(npcId);

    if (!campanhaId || !campanhaNpcId) {
      return NextResponse.json(
        { ok: false, error: "Parâmetros de NPC inválidos." },
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

    const existente = await findNpcInCampaign(campanhaNpcId, campanhaId);
    if (!existente) {
      return NextResponse.json(
        { ok: false, error: "NPC não encontrado nesta campanha." },
        { status: 404 }
      );
    }

    const dados = await prepararDadosNpcCampanha(await request.json());
    const npc = await prisma.campanhaNpc.update({
      where: { id: campanhaNpcId },
      data: dados,
    });

    return NextResponse.json({ ok: true, npc });
  } catch (error) {
    if (error instanceof NpcCampanhaError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro ao atualizar NPC da campanha:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao atualizar NPC." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; npcId: string }> }
) {
  try {
    const { id, npcId } = await params;
    const campanhaId = parsePositive(id);
    const campanhaNpcId = parsePositive(npcId);

    if (!campanhaId || !campanhaNpcId) {
      return NextResponse.json(
        { ok: false, error: "Parâmetros de NPC inválidos." },
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

    const existente = await findNpcInCampaign(campanhaNpcId, campanhaId);
    if (!existente) {
      return NextResponse.json(
        { ok: false, error: "NPC não encontrado nesta campanha." },
        { status: 404 }
      );
    }

    await prisma.campanhaNpc.delete({ where: { id: campanhaNpcId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir NPC da campanha:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao excluir NPC." },
      { status: 500 }
    );
  }
}
