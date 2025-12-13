// src/app/api/personagem/[id]/slots/[tipo]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import {
  calcularLimiteSlotsDefensivos,
  SlotDefensivoTipo,
} from "@/lib/regras/slotsDefensivos";

import { SlotsDefensivos } from "@/types";

/* =======================================================
   POST /api/personagem/[id]/slots/[tipo]

   Responsável por:
   - Validar parâmetros da rota
   - Buscar personagem, perícias e slots
   - Calcular limite de uso baseado nas regras
   - Incrementar o slot defensivo
======================================================= */
export async function POST(
  _req: NextRequest,
  context: {
    params: Promise<{
      id: string;
      tipo: string;
    }>;
  }
) {
  try {
    const { id, tipo } = await context.params;
    const personagemId = Number(id);
    const slotTipo = tipo as SlotDefensivoTipo;

    /* ---------------------------------------------------
       Validação básica
    ---------------------------------------------------- */
    if (isNaN(personagemId)) {
      return NextResponse.json(
        { error: "ID do personagem inválido" },
        { status: 400 }
      );
    }

    if (!["esquiva", "bloqueio", "contra"].includes(slotTipo)) {
      return NextResponse.json(
        { error: "Tipo de slot defensivo inválido" },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------
       Busca personagem + perícias + slots defensivos
    ---------------------------------------------------- */
    const personagem = await prisma.personagem.findUnique({
      where: { id: personagemId },
      include: {
        periciaPersonagem: {
          include: {
            pericia: true,
          },
        },
        slotsDefensivos: true,
      },
    });

    if (!personagem) {
      return NextResponse.json(
        { error: "Personagem não encontrado" },
        { status: 404 }
      );
    }

    if (!personagem.slotsDefensivos) {
      return NextResponse.json(
        {
          error:
            "Slots defensivos não configurados para este personagem",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------
       Normalização das perícias
       (formato esperado pela regra de negócio)
    ---------------------------------------------------- */
    const periciasPersonagem = personagem.periciaPersonagem.map(
      (pp) => ({
        nome: pp.pericia.nome,
        tipo: pp.pericia.tipo,
        pontuacao: pp.pontuacao,
        descricao:
          pp.descricao ??
          pp.pericia.descricao ??
          "",
      })
    );

    /* ---------------------------------------------------
       Cálculo do limite conforme regras do sistema
    ---------------------------------------------------- */
    const limite = calcularLimiteSlotsDefensivos(
      slotTipo,
      periciasPersonagem
    );

    const slots = personagem.slotsDefensivos as SlotsDefensivos;

    const usados =
      slotTipo === "esquiva"
        ? slots.esquivaUsada
        : slotTipo === "bloqueio"
        ? slots.bloqueioUsado
        : slots.contraAtaqueUsado;

    if (usados >= limite) {
      return NextResponse.json(
        {
          error:
            "Limite de uso atingido para este slot defensivo",
          limite,
          usados,
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------
       Atualização do slot (incremento)
    ---------------------------------------------------- */
    const data =
      slotTipo === "esquiva"
        ? { esquivaUsada: usados + 1 }
        : slotTipo === "bloqueio"
        ? { bloqueioUsado: usados + 1 }
        : { contraAtaqueUsado: usados + 1 };

    await prisma.slotsDefensivos.update({
      where: { personagemId },
      data,
    });

    /* ---------------------------------------------------
       Retorno de sucesso
    ---------------------------------------------------- */
    return NextResponse.json({
      success: true,
      tipo: slotTipo,
      usadosAntes: usados,
      usadosAgora: usados + 1,
      limite,
    });
  } catch (error) {
    console.error(
      "Erro ao usar slot defensivo:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao processar slot defensivo",
      },
      { status: 500 }
    );
  }
}
