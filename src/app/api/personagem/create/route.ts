import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const allowedElements = new Set(["natureza", "agua", "fogo", "vento"]);

function toPositiveInt(value: unknown) {
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
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
    const apelido = String(body?.apelido ?? "").trim();
    const descricao = String(body?.descricao ?? "").trim();
    const urlImagem = String(body?.url_imagem ?? "").trim();
    const elemento = String(body?.elemento ?? "").trim().toLowerCase();

    const campanhaId = toPositiveInt(body?.campanhaId);
    const classeId = toPositiveInt(body?.classeId);
    const racaId = toPositiveInt(body?.racaId);

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "Nome do personagem é obrigatório." },
        { status: 400 }
      );
    }

    if (!campanhaId || !classeId || !racaId) {
      return NextResponse.json(
        { ok: false, error: "Campanha, classe e raça são obrigatórias." },
        { status: 400 }
      );
    }

    if (!allowedElements.has(elemento)) {
      return NextResponse.json(
        { ok: false, error: "Elemento inválido." },
        { status: 400 }
      );
    }

    const [campanha, classe, raca] = await prisma.$transaction([
      prisma.campanha.findUnique({ where: { id: campanhaId } }),
      prisma.classe.findUnique({ where: { id: classeId } }),
      prisma.raca.findUnique({ where: { id: racaId } }),
    ]);

    if (!campanha) {
      return NextResponse.json(
        { ok: false, error: "Campanha não encontrada." },
        { status: 400 }
      );
    }

    if (!classe) {
      return NextResponse.json(
        { ok: false, error: "Classe não encontrada." },
        { status: 400 }
      );
    }

    if (!raca) {
      return NextResponse.json(
        { ok: false, error: "Raça não encontrada." },
        { status: 400 }
      );
    }

    const hpBase = (raca.hp ?? 0) + (classe.hp ?? 0);
    const manaBase = (raca.mana ?? 0) + (classe.mana ?? 0);

    const personagem = await prisma.personagem.create({
      data: {
        nome,
        apelido: apelido || null,
        descricao: descricao || null,
        campanhaId,
        classeId,
        racaId,
        elemento,
        url_imagem: urlImagem || null,
        hp_base: hpBase,
        mana_base: manaBase,
        hp_atual: hpBase,
        mana_atual: manaBase,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { ok: true, id: personagem.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar personagem:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
