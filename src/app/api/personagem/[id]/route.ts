// app/personagens/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
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

    // Busca personagem com raça, classe e slots defensivos
    const personagem = await prisma.personagem.findUnique({
      where: { id: personagemId },
      include: {
        raca: true,
        classe: true,
        slotsDefensivos: true,
      },
    });

    if (!personagem) {
      return NextResponse.json(
        { error: "Personagem não encontrado" },
        { status: 404 }
      );
    }

    // Busca vínculos separadamente
    const magiaPersonagem = await prisma.magiaPersonagem.findMany({
      where: { personagemId },
      include: { magia: true },
    });

    const periciaPersonagem = await prisma.periciaPersonagem.findMany({
      where: { personagemId },
      include: { pericia: true },
    });

    // Calcula HP e Mana base
    const hpBase = (personagem.raca?.hp ?? 0) + (personagem.classe?.hp ?? 0);
    const manaBase =
      (personagem.raca?.mana ?? 0) + (personagem.classe?.mana ?? 0);

    // Map magias
    const magias = (magiaPersonagem ?? [])
      .map((mp) => {
        const catalog = mp.magia;
        return {
          nome: catalog?.nome ?? null,
          alcance:
            mp.descricao && !catalog?.alcance
              ? null
              : catalog?.alcance ?? null,
          descricao: mp.descricao ?? catalog?.descricao ?? "",
          custo_nivel: mp.custo_nivel ?? catalog?.custo_nivel ?? null,
        };
      })
      .filter((m) => m.nome !== null);

    // Map perícias
    const pericias = (periciaPersonagem ?? [])
      .map((pp) => {
        const catalog = pp.pericia;
        return {
          nome: catalog?.nome ?? null,
          tipo: catalog?.tipo ?? "",
          pontuacao: pp.pontuacao ?? 0,
          descricao: pp.descricao ?? catalog?.descricao ?? "",
        };
      })
      .filter((p) => p.nome !== null);

    const result = {
      id: personagem.id,
      nome:
        personagem.apelido && personagem.apelido.trim() !== ""
          ? personagem.apelido
          : personagem.nome,
      apelido: personagem.apelido ?? null,
      campanhaId: personagem.campanhaId,
      classeId: personagem.classeId,
      classe_nome: personagem.classe?.nome ?? null,
      racaId: personagem.racaId,
      raca_nome: personagem.raca?.nome ?? null,
      elemento: personagem.elemento,
      hp_atual: personagem.hp_atual ?? null,
      mana_atual: personagem.mana_atual ?? null,
      hp: hpBase,
      mana: manaBase,
      sobre: personagem.descricao ?? null,
      url_imagem: personagem.url_imagem ?? null,
      imagem_pixel: personagem.imagem_pixel ?? null,
      magias,
      pericias,
      status_baile: personagem.status_baile ?? null,

      // 🔥 NOVO — Slots defensivos
      slotsDefensivos: personagem.slotsDefensivos
        ? {
            esquivaUsada: personagem.slotsDefensivos.esquivaUsada,
            bloqueioUsado: personagem.slotsDefensivos.bloqueioUsado,
            contraAtaqueUsado:
              personagem.slotsDefensivos.contraAtaqueUsado,
          }
        : null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar personagem:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
