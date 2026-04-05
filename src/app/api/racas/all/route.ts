import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const racas = await prisma.raca.findMany({
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
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ ok: true, data: racas }, { status: 200 });
  } catch (error) {
    console.error("API /racas/all error:", error);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
