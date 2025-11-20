// src/app/api/campanhas/personagens/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
     const { id } = await params;
    const idParam = id;
    if (!idParam) {
      return NextResponse.json({ error: "ID da campanha inválido" }, { status: 400 });
    }

    const campanhaId = Number(idParam);
    if (Number.isNaN(campanhaId)) {
      return NextResponse.json({ error: "ID da campanha inválido" }, { status: 400 });
    }

    const personagens = await prisma.personagem.findMany({
      where: { campanhaId },
      include: {
        raca: true,
        classe: true,
        magiaPersonagem: { include: { magia: true } },
        periciaPersonagem: { include: { pericia: true } },
      },
      orderBy: { id: "asc" },
    });

    // mapeia para formato do frontend (compatível com PersonagemInterface)
    const mapped = (personagens || []).map((p) => {
      const nomeFinal = (p.apelido && p.apelido.trim() !== "") ? p.apelido : p.nome;

      const hpBase = (p.hp_base !== null && p.hp_base !== undefined)
        ? p.hp_base
        : ((p.raca?.hp ?? 0) + (p.classe?.hp ?? 0));

      const manaBase = (p.mana_base !== null && p.mana_base !== undefined)
        ? p.mana_base
        : ((p.raca?.mana ?? 0) + (p.classe?.mana ?? 0));

      const magias = (p.magiaPersonagem ?? []).map(mp => {
        const catalog = mp.magia;
        return {
          nome: catalog?.nome ?? null,
          alcance: catalog?.alcance ?? mp.descricao ?? null,
          descricao: mp.descricao ?? catalog?.descricao ?? '',
          custo_nivel: mp.custo_nivel ?? catalog?.custo_nivel ?? null,
        };
      }).filter(m => m.nome !== null);

      const pericias = (p.periciaPersonagem ?? []).map(pp => {
        const catalog = pp.pericia;
        return {
          nome: catalog?.nome ?? null,
          tipo: catalog?.tipo ?? '',
          pontuacao: pp.pontuacao ?? 0,
          descricao: pp.descricao ?? catalog?.descricao ?? '',
        };
      }).filter(x => x.nome !== null);

      return {
        _id: String(p.id),
        id: p.id,
        nome: nomeFinal,
        apelido: p.apelido ?? null,
        campanha_id: p.campanhaId,
        classe_id: p.classeId,
        classe_nome: p.classe?.nome ?? null,
        raca_id: p.racaId,
        raca_nome: p.raca?.nome ?? null,
        elemento: p.elemento,
        hp_atual: p.hp_atual ?? null,
        mana_atual: p.mana_atual ?? null,
        hp: hpBase,
        mana: manaBase,
        sobre: p.descricao ?? null,
        url_imagem: p.url_imagem ?? null,
        imagem_pixel: p.imagem_pixel ?? null,
        magias,
        pericias,
        status_baile: p.status_baile ?? null,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Erro ao buscar personagens da campanha:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
