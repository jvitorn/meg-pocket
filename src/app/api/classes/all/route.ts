// src/app/api/classes/all/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const classes = await prisma.classe.findMany({
      select: {
        id: true,
        slug: true,
        nome: true,
        subtitulo: true,
        descricao: true,
        img_corpo: true,
        exemploPersonagem: true,
        tags: true,
        hp: true,
        mana: true,
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ ok: true, data: classes }, { status: 200 });
  } catch (error) {
    console.error("API /classes/all error:", error);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
