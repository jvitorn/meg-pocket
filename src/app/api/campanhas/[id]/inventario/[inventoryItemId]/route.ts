import { ItemTipo } from "@prisma/client";
import { NextResponse } from "next/server";

import { normalizarQuantidadeItem } from "@/lib/personagemInventario";
import { validarMestreDaCampanha } from "@/lib/regras/campanhaPermissao";
import { toPositiveInt } from "@/lib/regras/personagemCriacao";
import { prisma } from "@/lib/prisma";

function parsePositive(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeItemTipo(value: unknown) {
  const tipo = String(value ?? "").trim().toUpperCase();
  return Object.values(ItemTipo).includes(tipo as ItemTipo) ? (tipo as ItemTipo) : null;
}

async function findInventoryInCampaign(inventoryItemId: number, campanhaId: number) {
  return prisma.itemInventario.findFirst({
    where: {
      id: inventoryItemId,
      personagem: { campanhaId },
    },
    include: {
      item: true,
      personagem: { select: { id: true, campanhaId: true } },
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; inventoryItemId: string }> }
) {
  try {
    const { id, inventoryItemId } = await params;
    const campanhaId = parsePositive(id);
    const itemInventarioId = parsePositive(inventoryItemId);

    if (!campanhaId || !itemInventarioId) {
      return NextResponse.json(
        { ok: false, error: "Parâmetros de inventário inválidos." },
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
    const action = String(body?.action ?? "update");
    const registro = await findInventoryInCampaign(itemInventarioId, campanhaId);

    if (!registro) {
      return NextResponse.json(
        { ok: false, error: "Item do inventário não encontrado nesta campanha." },
        { status: 404 }
      );
    }

    if (action === "transfer") {
      const targetPersonagemId = toPositiveInt(body?.targetPersonagemId);

      if (!targetPersonagemId || targetPersonagemId === registro.personagemId) {
        return NextResponse.json(
          { ok: false, error: "Escolha um personagem de destino diferente." },
          { status: 400 }
        );
      }

      const destino = await prisma.personagem.findFirst({
        where: { id: targetPersonagemId, campanhaId },
        select: { id: true },
      });

      if (!destino) {
        return NextResponse.json(
          { ok: false, error: "Destino não pertence a esta campanha." },
          { status: 404 }
        );
      }

      await prisma.$transaction(async (tx) => {
        const existente = await tx.itemInventario.findUnique({
          where: {
            personagemId_itemId: {
              personagemId: targetPersonagemId,
              itemId: registro.itemId,
            },
          },
        });

        if (existente) {
          await tx.itemInventario.update({
            where: { id: existente.id },
            data: {
              quantidade: {
                increment: normalizarQuantidadeItem(registro.quantidade),
              },
              durabilidadeAtual: registro.durabilidadeAtual,
              durabilidadeMax: registro.durabilidadeMax,
              efeitoAtivo: registro.efeitoAtivo,
              esgotadoEm: registro.esgotadoEm,
              observacoes: registro.observacoes,
            },
          });
          await tx.itemInventario.delete({ where: { id: registro.id } });
          return;
        }

        await tx.itemInventario.update({
          where: { id: registro.id },
          data: { personagemId: targetPersonagemId },
        });
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "recover") {
      const durabilidadeMax =
        registro.durabilidadeMax ??
        registro.item.durabilidadeMax ??
        registro.item.durabilidadeBase;

      await prisma.itemInventario.update({
        where: { id: registro.id },
        data: {
          quantidade: Math.max(1, normalizarQuantidadeItem(registro.quantidade)),
          durabilidadeAtual: registro.item.durabilidadeBase ?? durabilidadeMax,
          durabilidadeMax,
          efeitoAtivo: false,
          esgotadoEm: null,
        },
      });

      return NextResponse.json({ ok: true });
    }

    const tipo = normalizeItemTipo(body?.tipo);
    const quantidade = normalizarQuantidadeItem(Number(body?.quantidade ?? registro.quantidade));
    const observacoes = String(body?.observacoes ?? "").trim() || null;

    await prisma.$transaction(async (tx) => {
      if (tipo && tipo !== registro.item.tipo) {
        await tx.item.update({
          where: { id: registro.itemId },
          data: { tipo },
        });
      }

      await tx.itemInventario.update({
        where: { id: registro.id },
        data: {
          quantidade,
          observacoes,
          ...(quantidade > 0 && registro.esgotadoEm ? { esgotadoEm: null } : {}),
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao editar inventário da campanha:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao editar item." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; inventoryItemId: string }> }
) {
  try {
    const { id, inventoryItemId } = await params;
    const campanhaId = parsePositive(id);
    const itemInventarioId = parsePositive(inventoryItemId);

    if (!campanhaId || !itemInventarioId) {
      return NextResponse.json(
        { ok: false, error: "Parâmetros de inventário inválidos." },
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

    const registro = await findInventoryInCampaign(itemInventarioId, campanhaId);

    if (!registro) {
      return NextResponse.json(
        { ok: false, error: "Item do inventário não encontrado nesta campanha." },
        { status: 404 }
      );
    }

    if (!registro.esgotadoEm && registro.quantidade > 0) {
      return NextResponse.json(
        { ok: false, error: "Apenas itens expirados podem ser apagados do histórico." },
        { status: 400 }
      );
    }

    await prisma.itemInventario.delete({ where: { id: registro.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao apagar item expirado da campanha:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao apagar item." },
      { status: 500 }
    );
  }
}
