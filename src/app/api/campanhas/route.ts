import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateCampanhasData } from "@/lib/cache/revalidate";
import { isValidExternalUrl } from "@/lib/regras/personagemCriacao";

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8)
    )
  );
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const nome = String(body?.nome ?? "").trim();
    const sinopse = String(body?.sinopse ?? "").trim();
    const mestre = String(
      body?.mestre ?? session.user.name ?? session.user.email ?? ""
    ).trim();
    const capa = String(body?.capa ?? "").trim();
    const tags = normalizeTags(body?.tags);

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "Nome da campanha é obrigatório." },
        { status: 400 }
      );
    }

    if (nome.length > 120 || sinopse.length > 2000 || mestre.length > 120) {
      return NextResponse.json(
        { ok: false, error: "Os dados da campanha excedem o limite permitido." },
        { status: 400 }
      );
    }

    if (capa && !isValidExternalUrl(capa)) {
      return NextResponse.json(
        { ok: false, error: "URL da capa inválida." },
        { status: 400 }
      );
    }

    const campanha = await prisma.campanha.create({
      data: {
        nome,
        sinopse: sinopse || null,
        mestre: mestre || null,
        capa: capa || null,
        tags,
        count_jogadores: 0,
        userId: session.user.id,
      },
      select: {
        id: true,
        nome: true,
        sinopse: true,
        capa: true,
        mestre: true,
        tags: true,
      },
    });

    revalidateCampanhasData();

    return NextResponse.json(
      {
        ok: true,
        campanha,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar campanha:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao criar campanha." },
      { status: 500 }
    );
  }
}
