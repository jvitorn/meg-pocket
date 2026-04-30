// src/app/api/classes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const classeId = Number(id);
    if (Number.isNaN(classeId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const classe = await prisma.classe.findUnique({
      where: { id: classeId },
      select: {
        id: true,
        slug: true,
        nome: true,
        icone: true,
        corTema: true,
        subtitulo: true,
        descricao: true,
        gameplay: true,
        img_corpo: true,
        exemploPersonagem: true,
        background: true,
        tags: true,
        hp: true,
        mana: true,
        personagens: {
          take: 16,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            nome: true,
            apelido: true,
            imagemPrincipal: true,
            imagemPerfil: true,
          },
        },
        Magias: {
          select: {
            id: true,
            nome: true,
            descricao: true,
            alcance: true,
            custo_nivel: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!classe) {
      return NextResponse.json({ ok: false, error: "Classe não encontrada" }, { status: 404 });
    }

    const { personagens, ...classeData } = classe;

    return NextResponse.json(
      {
        ok: true,
        data: {
          ...classeData,
          Personagens: personagens,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API /classes/[id] error:", error);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
