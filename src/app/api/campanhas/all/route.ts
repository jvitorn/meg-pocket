// src/app/api/campanhas/all/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CampanhaInterface } from "@/types";

export async function GET() {
  try {
    const rows = await prisma.campanha.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        nome: true,
        sinopse: true,
        capa: true,
        count_jogadores: true,
        mestre: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Mapeia para o formato legado esperado pelo frontend (CampanhaInterface)
    const campanhas: CampanhaInterface[] = (rows || []).map((r) => {
      // tags pode ser JSON no banco; garantir array ou undefined
      const tags = Array.isArray(r.tags) ? r.tags : (r.tags ? r.tags : undefined);

      return {
        id: r.id,               // mantém compatibilidade com o frontend
        nome: r.nome,
        sinopse: r.sinopse ?? undefined,
        capa: r.capa ?? undefined,
        count_jogadores: r.count_jogadores ?? 0,
        mestre: r.mestre ?? "",
        tags: tags as string[] | undefined,
      };
    });

    // Retornar array vazio quando não há campanhas (útil pro frontend)
    return NextResponse.json(campanhas);
  } catch (error) {
    console.error("Erro ao listar campanhas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
