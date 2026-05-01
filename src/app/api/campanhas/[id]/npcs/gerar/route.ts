import { NextResponse } from "next/server";

import { NpcCampanhaError, gerarNpcProcedural } from "@/lib/regras/campanhaNpc";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";

function parseCampaignId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

    const body = await request.json().catch(() => ({}));
    const npc = await gerarNpcProcedural(body?.filtros ?? body);

    return NextResponse.json({ ok: true, npc });
  } catch (error) {
    if (error instanceof NpcCampanhaError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro ao gerar NPC procedural:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao gerar NPC." },
      { status: 500 }
    );
  }
}
