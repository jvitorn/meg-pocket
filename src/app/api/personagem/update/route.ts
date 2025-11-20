// src/app/api/personagem/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  index?: number | string; // aqui deve vir o ID (pk) do personagem
  campo: string;
  valor: any;
};

const numericFields = new Set([
  "hp",
  "hp_atual",
  "mana",
  "mana_atual",
  "count_jogadores",
  "campanha_id",
  "classe_id",
  "raca_id",
  "hp_base",
  "mana_base",
  "index",
]);

const allowedFields = new Set([
  "nome",
  "apelido",
  "descricao",
  "sobre",
  "campanha_id",
  "classe_id",
  "raca_id",
  "elemento",
  "hp_atual",
  "mana_atual",
  "hp_base",
  "mana_base",
  "imagem_pixel",
  "url_imagem",
  "index",
  "status_baile",
]);

function normalizeField(field: string) {
  if (field === "sobre") return "descricao";
  if (field === "raca_id") return "racaId";
  if (field === "classe_id") return "classeId";
  if (field === "campanha_id") return "campanhaId";
  return field;
}

export async function POST(request: Request) {
  try {
    const body: Body = await request.json();
    const { index, campo, valor } = body;

    if (!campo || typeof campo !== "string") {
      return NextResponse.json({ success: false, error: "Campo 'campo' inválido ou não informado." }, { status: 400 });
    }

    if (typeof index === "undefined" || index === null || index === "") {
      return NextResponse.json({ success: false, error: "Parâmetro 'index' obrigatório (deve ser o id do personagem)." }, { status: 400 });
    }

    const id = Number(index);
    if (Number.isNaN(id) || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Index inválido (deve ser um id inteiro positivo)." }, { status: 400 });
    }

    if (!allowedFields.has(campo)) {
      return NextResponse.json({
        success: false,
        error: `Campo '${campo}' não permitido por esta rota. Use endpoints específicos para magias/pericias/inventario.`,
      }, { status: 400 });
    }

    const dbField = normalizeField(campo);

    // converte se for campo numérico
    let newValue: any = valor;
    if (numericFields.has(campo) && typeof valor === "string" && valor.trim() !== "") {
      const maybeNum = Number(valor);
      if (Number.isNaN(maybeNum)) {
        return NextResponse.json({ success: false, error: `Valor numérico inválido para campo ${campo}` }, { status: 400 });
      }
      newValue = maybeNum;
    }

    // prepara objeto de update reduzido
    const updates: any = {};
    if (dbField === "classeId") {
      // verificamos existência; se não existir, abortamos
      const classeExists = await prisma.classe.findUnique({ where: { id: Number(newValue) }});
      if (!classeExists) return NextResponse.json({ success: false, error: "Classe não encontrada." }, { status: 400 });
      updates.classeId = Number(newValue);
    } else if (dbField === "racaId") {
      const racaExists = await prisma.raca.findUnique({ where: { id: Number(newValue) }});
      if (!racaExists) return NextResponse.json({ success: false, error: "Raça não encontrada." }, { status: 400 });
      updates.racaId = Number(newValue);
    } else if (dbField === "campanhaId") {
      updates.campanhaId = Number(newValue);
    } else if (dbField === "descricao") {
      updates.descricao = String(newValue ?? "");
    } else if (dbField === "index") {
      updates.index = Number(newValue);
    } else if (dbField === "hp_atual" || dbField === "mana_atual" || dbField === "hp_base" || dbField === "mana_base") {
      updates[dbField] = Number(newValue);
    } else if (dbField === "status_baile") {
      updates.status_baile = String(newValue ?? null);
    } else {
      updates[dbField] = newValue;
    }

    // Executa update e busca magias/pericias em uma transação para minimizar roundtrips
    // Update retorna raca e classe embutidas (necessários para hp/mana base fallback)
    const [updated, magiasRaw, periciasRaw] = await prisma.$transaction([
      prisma.personagem.update({
        where: { id },
        data: updates,
        include: {
          raca: true,
          classe: true,
        },
        // retornamos apenas os campos necessários; evitar select gigante
      }),
      prisma.magiaPersonagem.findMany({
        where: { personagemId: id },
        include: { magia: true },
      }),
      prisma.periciaPersonagem.findMany({
        where: { personagemId: id },
        include: { pericia: true },
      }),
    ]);

    // calcula hp/mana finais (tratando hp_base/mana_base = 0 como valor válido)
    const hpBase = (updated.hp_base !== null && updated.hp_base !== undefined)
      ? updated.hp_base
      : ((updated.raca?.hp ?? 0) + (updated.classe?.hp ?? 0));

    const manaBase = (updated.mana_base !== null && updated.mana_base !== undefined)
      ? updated.mana_base
      : ((updated.raca?.mana ?? 0) + (updated.classe?.mana ?? 0));

    const magias = (magiasRaw ?? []).map(mp => {
      const catalog = mp.magia;
      return {
        nome: catalog?.nome ?? null,
        alcance: catalog?.alcance ?? mp.descricao ?? null,
        descricao: mp.descricao ?? catalog?.descricao ?? '',
        custo_nivel: mp.custo_nivel ?? catalog?.custo_nivel ?? null,
      };
    }).filter(m => m.nome !== null);

    const pericias = (periciasRaw ?? []).map(pp => {
      const catalog = pp.pericia;
      return {
        nome: catalog?.nome ?? null,
        tipo: catalog?.tipo ?? '',
        pontuacao: pp.pontuacao ?? 0,
        descricao: pp.descricao ?? catalog?.descricao ?? '',
      };
    }).filter(p => p.nome !== null);

    const result = {
      success: true,
      personagem: {
        id: updated.id,
        nome: (updated.apelido && updated.apelido.trim() !== '') ? updated.apelido : updated.nome,
        apelido: updated.apelido ?? null,
        campanhaId: updated.campanhaId,
        classeId: updated.classeId,
        classe_nome: updated.classe?.nome ?? null,
        racaId: updated.racaId,
        raca_nome: updated.raca?.nome ?? null,
        elemento: updated.elemento,
        hp_atual: updated.hp_atual ?? null,
        mana_atual: updated.mana_atual ?? null,
        hp: hpBase,
        mana: manaBase,
        sobre: updated.descricao ?? null,
        url_imagem: updated.url_imagem ?? null,
        imagem_pixel: updated.imagem_pixel ?? null,
        magias,
        pericias,
        status_baile: updated.status_baile ?? null,
      }
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro ao atualizar personagem:", error);
    // tratamento de not found (Prisma P2025)
    if (error?.code === "P2025") {
      return NextResponse.json({ success: false, error: "Personagem não encontrado." }, { status: 404 });
    }
    const message = error?.message ?? String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
