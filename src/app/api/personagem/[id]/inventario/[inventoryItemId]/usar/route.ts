import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarEdicaoDaFicha } from "@/lib/regras/personagemPermissao";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
} from "@/lib/security/rate-limit";
import {
  montarResumoInventario,
  normalizarItemInventario,
} from "@/lib/personagemInventario";
import { resolverLimitesPersonagem } from "@/lib/personagemAtributos";
import { acumularDefesaTemporaria } from "@/lib/regras/personagemDefesa";

function jsonError(
  message: string,
  status: number,
  headers?: HeadersInit
) {
  return NextResponse.json({ success: false, error: message }, { status, headers });
}

function parsePositiveInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function carregarInventario(personagemId: number) {
  const inventarioRaw = await prisma.itemInventario.findMany({
    where: { personagemId },
    include: { item: { include: { efeito: true } } },
    orderBy: [{ createdAt: "asc" }],
  });

  const inventario = inventarioRaw
    .map(normalizarItemInventario)
    .filter((item) => item !== null);

  return {
    inventario,
    inventarioResumo: montarResumoInventario(inventario),
  };
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; inventoryItemId: string }>;
  }
) {
  try {
    const { id, inventoryItemId } = await params;
    const personagemId = parsePositiveInteger(id);
    const itemInventarioId = parsePositiveInteger(inventoryItemId);

    if (!personagemId || !itemInventarioId) {
      return jsonError("Parâmetros de inventário inválidos.", 400);
    }

    const permissao = await validarEdicaoDaFicha(personagemId);
    if (!permissao.ok) {
      return jsonError(permissao.error, permissao.status);
    }

    const rateLimit = await enforceRateLimit(request, {
      key: "personagem:inventario:usar",
      limit: 30,
      windowMs: 60_000,
      identifier: permissao.userId,
    });

    const headers = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return jsonError(
        "Muitas alterações em sequência. Aguarde alguns instantes.",
        429,
        headers
      );
    }

    const registro = await prisma.itemInventario.findFirst({
      where: {
        id: itemInventarioId,
        personagemId,
      },
      include: { item: { include: { efeito: true } } },
    });

    if (!registro) {
      return jsonError("Item do inventário não encontrado.", 404, headers);
    }

    if (registro.esgotadoEm) {
      return jsonError("Este item já foi esgotado e não pode mais ser usado.", 400, headers);
    }

    const durabilidadeMax =
      registro.durabilidadeMax ??
      registro.item.durabilidadeMax ??
      registro.item.durabilidadeBase;
    const durabilidadeAtual =
      registro.durabilidadeAtual ??
      registro.item.durabilidadeBase ??
      durabilidadeMax ??
      1;
    const controlaDurabilidade =
      registro.durabilidadeAtual !== null ||
      registro.durabilidadeMax !== null ||
      registro.item.durabilidadeBase !== null ||
      registro.item.durabilidadeMax !== null;
    const efeito = registro.item.efeito;
    const itemComEfeitoUsavel = Boolean(efeito);
    const durabilidadeMaxEfetiva = itemComEfeitoUsavel ? 1 : durabilidadeMax;
    const durabilidadeAtualEfetiva = itemComEfeitoUsavel
      ? Math.min(1, Math.max(0, durabilidadeAtual))
      : durabilidadeAtual;

    try {
      await prisma.$transaction(async (tx) => {
        const personagem = await tx.personagem.findUnique({
          where: { id: personagemId },
          select: {
            hp_atual: true,
            hp_base: true,
            mana_atual: true,
            mana_base: true,
            defesa_atual: true,
            defesa_max: true,
            statusEspecial: true,
            raca: {
              select: {
                hp: true,
                mana: true,
              },
            },
            classe: {
              select: {
                hp: true,
                mana: true,
              },
            },
          },
        });

        if (!personagem) {
          throw new Error("Personagem não encontrado.");
        }

        const limites = resolverLimitesPersonagem({
          hpBasePersistida: personagem.hp_base,
          manaBasePersistida: personagem.mana_base,
          hpDerivado: (personagem.raca?.hp ?? 0) + (personagem.classe?.hp ?? 0),
          manaDerivado:
            (personagem.raca?.mana ?? 0) + (personagem.classe?.mana ?? 0),
          hpAtual: personagem.hp_atual,
          manaAtual: personagem.mana_atual,
          statusEspecial: personagem.statusEspecial,
        });

        if (efeito?.modulo === "VIDA") {
          const atual = personagem.hp_atual ?? 0;
          const delta = efeito.operacao === "REMOVER" ? -efeito.valor : efeito.valor;
          const novo = Math.max(0, Math.min(limites.hpMaxSeguro, atual + delta));

          await tx.personagem.update({
            where: { id: personagemId },
            data: {
              hp_atual: novo,
            },
          });
        }

        if (efeito?.modulo === "MANA") {
          const atual = personagem.mana_atual ?? 0;
          const delta = efeito.operacao === "REMOVER" ? -efeito.valor : efeito.valor;
          const novo = Math.max(0, Math.min(limites.manaMaxSeguro, atual + delta));

          await tx.personagem.update({
            where: { id: personagemId },
            data: {
              mana_atual: novo,
            },
          });
        }

        if (efeito?.modulo === "DEFESA") {
          if (registro.efeitoAtivo) {
            throw new Error("O efeito defensivo deste item já está ativo na ficha.");
          }

          if (efeito.operacao !== "ADICIONAR") {
            throw new Error("Efeito de defesa inválido para uso na ficha.");
          }

          const defesaAtualizada = acumularDefesaTemporaria({
            defesaAtual: personagem.defesa_atual,
            defesaMax: personagem.defesa_max,
            valorEfeito: efeito.valor,
          });

          await tx.personagem.update({
            where: { id: personagemId },
            data: defesaAtualizada,
          });

          await tx.itemInventario.update({
            where: { id: registro.id },
            data: {
              durabilidadeAtual: controlaDurabilidade
                ? Math.max(0, durabilidadeAtualEfetiva - 1)
                : null,
              durabilidadeMax: durabilidadeMaxEfetiva,
              efeitoAtivo: true,
            },
          });
          return;
        }

        if (durabilidadeAtualEfetiva > 1) {
          await tx.itemInventario.update({
            where: { id: registro.id },
            data: {
              durabilidadeAtual: durabilidadeAtualEfetiva - 1,
              durabilidadeMax: durabilidadeMaxEfetiva,
              efeitoAtivo: registro.efeitoAtivo,
            },
          });
          return;
        }

        if (registro.quantidade > 1) {
          await tx.itemInventario.update({
            where: { id: registro.id },
            data: {
              quantidade: registro.quantidade - 1,
              durabilidadeAtual: controlaDurabilidade
                ? durabilidadeMaxEfetiva
                : null,
              durabilidadeMax: durabilidadeMaxEfetiva,
              efeitoAtivo: false,
            },
          });
          return;
        }

        await tx.itemInventario.update({
          where: { id: registro.id },
          data: {
            quantidade: 0,
            durabilidadeAtual: 0,
            durabilidadeMax: durabilidadeMaxEfetiva,
            efeitoAtivo: false,
            esgotadoEm: new Date(),
          },
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        return jsonError(error.message, 400, headers);
      }

      throw error;
    }

    const payload = await carregarInventario(personagemId);
    const personagemAtualizado = await prisma.personagem.findUnique({
      where: { id: personagemId },
      select: {
        hp_atual: true,
        mana_atual: true,
        defesa_atual: true,
        defesa_max: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${registro.item.nome} usado com sucesso.`,
        personagem: personagemAtualizado,
        ...payload,
      },
      { headers }
    );
  } catch (error) {
    console.error("Erro ao usar item do inventário:", error);
    return jsonError("Erro interno do servidor.", 500);
  }
}
