import { NextResponse } from "next/server";

import { revalidateCampanhasData } from "@/lib/cache/revalidate";
import { isValidExternalUrl } from "@/lib/regras/personagemCriacao";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import { prisma } from "@/lib/prisma";

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8)
    )
  );
}

function parseCampaignId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(
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
    const nome = String(body?.nome ?? "").trim();
    const sinopse = String(body?.sinopse ?? "").trim();
    const mestre = String(body?.mestre ?? "").trim();
    const capa = String(body?.capa ?? "").trim();
    const tags = normalizeTags(body?.tags);

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "Nome da campanha é obrigatório." },
        { status: 400 }
      );
    }

    if (nome.length > 120 || sinopse.length > 2000 || mestre.length > 120) {
      return NextResponse.json(
        { ok: false, error: "Os dados da campanha excedem o limite permitido." },
        { status: 400 }
      );
    }

    if (capa && !isValidExternalUrl(capa)) {
      return NextResponse.json(
        { ok: false, error: "URL da capa inválida." },
        { status: 400 }
      );
    }

    const campanha = await prisma.campanha.update({
      where: { id: campanhaId },
      data: {
        nome,
        sinopse: sinopse || null,
        mestre: mestre || null,
        capa: capa || null,
        tags,
      },
      select: {
        id: true,
        nome: true,
        sinopse: true,
        mestre: true,
        capa: true,
        tags: true,
      },
    });

    revalidateCampanhasData();

    return NextResponse.json({ ok: true, campanha });
  } catch (error) {
    console.error("Erro ao editar campanha:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao editar campanha." },
      { status: 500 }
    );
  }
}
