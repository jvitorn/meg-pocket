import { NextResponse } from "next/server";

import { normalizarQuantidadeItem } from "@/lib/personagemInventario";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import { toPositiveInt } from "@/lib/regras/personagemCriacao";
import { prisma } from "@/lib/prisma";

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

    const body = await request.json();
    const personagemId = toPositiveInt(body?.personagemId);
    const itemId = toPositiveInt(body?.itemId);
    const quantidade = normalizarQuantidadeItem(Number(body?.quantidade ?? 1));
    const observacoes = String(body?.observacoes ?? "").trim() || null;

    if (!personagemId || !itemId) {
      return NextResponse.json(
        { ok: false, error: "Personagem e item são obrigatórios." },
        { status: 400 }
      );
    }

    const [personagem, item] = await prisma.$transaction([
      prisma.personagem.findFirst({
        where: { id: personagemId, campanhaId },
        select: { id: true },
      }),
      prisma.item.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          durabilidadeBase: true,
          durabilidadeMax: true,
          efeito: true,
        },
      }),
    ]);

    if (!personagem) {
      return NextResponse.json(
        { ok: false, error: "Personagem não pertence a esta campanha." },
        { status: 404 }
      );
    }

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Item não encontrado no catálogo." },
        { status: 404 }
      );
    }

    const durabilidadeMaxCatalogo = item.efeito
      ? 1
      : (item.durabilidadeMax ?? item.durabilidadeBase);
    const durabilidadeAtualCatalogo = item.efeito
      ? 1
      : (item.durabilidadeBase ?? durabilidadeMaxCatalogo);
    const durabilidadeMaxBody = toPositiveInt(body?.durabilidadeMax);
    const durabilidadeAtualBody = toPositiveInt(body?.durabilidadeAtual);
    const durabilidadeMax = durabilidadeMaxBody ?? durabilidadeMaxCatalogo;
    const durabilidadeAtual =
      durabilidadeMax && durabilidadeAtualBody
        ? Math.min(durabilidadeAtualBody, durabilidadeMax)
        : durabilidadeAtualCatalogo;

    await prisma.itemInventario.upsert({
      where: {
        personagemId_itemId: {
          personagemId,
          itemId,
        },
      },
      create: {
        personagemId,
        itemId,
        quantidade,
        durabilidadeAtual,
        durabilidadeMax,
        observacoes,
      },
      update: {
        quantidade: { increment: quantidade },
        durabilidadeAtual,
        durabilidadeMax,
        efeitoAtivo: false,
        esgotadoEm: null,
        ...(observacoes ? { observacoes } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao vincular item na campanha:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao vincular item." },
      { status: 500 }
    );
  }
}
