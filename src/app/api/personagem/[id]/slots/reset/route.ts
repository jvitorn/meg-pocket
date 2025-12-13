import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Reseta todos os slots defensivos do personagem.
 * Usado ao final de um combate.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personagemId = Number(id);

    if (isNaN(personagemId)) {
      return NextResponse.json(
        { error: "ID do personagem inválido" },
        { status: 400 }
      );
    }

    const slots = await prisma.slotsDefensivos.findUnique({
      where: { personagemId },
    });

    if (!slots) {
      return NextResponse.json(
        { error: "Slots defensivos não encontrados" },
        { status: 404 }
      );
    }

    await prisma.slotsDefensivos.update({
      where: { personagemId },
      data: {
        esquivaUsada: 0,
        bloqueioUsado: 0,
        contraAtaqueUsado: 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao resetar slots:", error);
    return NextResponse.json(
      { error: "Erro interno ao resetar slots defensivos" },
      { status: 500 }
    );
  }
}
