import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const racaId = Number(id);

    if (Number.isNaN(racaId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const raca = await prisma.raca.findUnique({
      where: { id: racaId },
      select: {
        id: true,
        nome: true,
        descricao: true,
        img: true,
        icone: true,
        corTema: true,
        habilidadeDiariaNome: true,
        habilidadeDiariaCombate: true,
        habilidadeDiariaForaDeCombate: true,
        hp: true,
        mana: true,
      },
    });

    if (!raca) {
      return NextResponse.json({ ok: false, error: "Raça não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: raca }, { status: 200 });
  } catch (error) {
    console.error("API /racas/[id] error:", error);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
