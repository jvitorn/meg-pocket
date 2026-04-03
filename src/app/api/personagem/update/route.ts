// src/app/api/personagem/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarEdicaoDaFicha } from "@/lib/regras/personagemPermissao";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
} from "@/lib/security/rate-limit";
import {
  calcularAtributosEspeciais,
  parseStatusEspecial,
} from "@/lib/regras/personagemEspecial";

type Body = {
  index?: number | string; // aqui deve vir o ID (pk) do personagem
  campo: string;
  valor: unknown;
};

const allowedFields = new Set(["sobre", "hp_atual", "mana_atual"]);

function parseNonNegativeInteger(value: unknown) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
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

    const permissao = await validarEdicaoDaFicha(id);
    if (!permissao.ok) {
      return NextResponse.json(
        { success: false, error: permissao.error },
        { status: permissao.status }
      );
    }

    if (!allowedFields.has(campo)) {
      return NextResponse.json(
        {
          success: false,
          error: `Campo '${campo}' não permitido por esta rota. Use endpoints específicos para magias/pericias/inventario.`,
        },
        { status: 400 }
      );
    }

    const rateLimit = await enforceRateLimit(request, {
      key: "personagem:update",
      limit: 30,
      windowMs: 60_000,
      identifier: permissao.userId,
    });

    const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Muitas alterações em sequência. Aguarde alguns instantes." },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const personagemAtual = await prisma.personagem.findUnique({
      where: { id },
      include: {
        raca: true,
        classe: true,
      },
    });

    if (!personagemAtual) {
      return NextResponse.json(
        { success: false, error: "Personagem não encontrado." },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    const hpBase =
      personagemAtual.hp_base ??
      (personagemAtual.raca?.hp ?? 0) + (personagemAtual.classe?.hp ?? 0);
    const manaBase =
      personagemAtual.mana_base ??
      (personagemAtual.raca?.mana ?? 0) + (personagemAtual.classe?.mana ?? 0);

    const statusEspecial = parseStatusEspecial(personagemAtual.statusEspecial);
    const { hpMax, manaMax } = calcularAtributosEspeciais({
      hpBase,
      manaBase,
      statusEspecial,
    });

    const updates: {
      descricao?: string;
      hp_atual?: number;
      mana_atual?: number;
    } = {};

    if (campo === "sobre") {
      const descricao = String(valor ?? "").trim();

      if (descricao.length > 2000) {
        return NextResponse.json(
          { success: false, error: "O campo sobre excede o limite permitido." },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      updates.descricao = descricao;
    }

    if (campo === "hp_atual") {
      const novoHp = parseNonNegativeInteger(valor);

      if (novoHp === null) {
        return NextResponse.json(
          { success: false, error: "Valor numérico inválido para campo hp_atual" },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      if (novoHp > hpMax) {
        return NextResponse.json(
          { success: false, error: `HP não pode ultrapassar ${hpMax}.` },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      updates.hp_atual = novoHp;
    }

    if (campo === "mana_atual") {
      const novaMana = parseNonNegativeInteger(valor);

      if (novaMana === null) {
        return NextResponse.json(
          { success: false, error: "Valor numérico inválido para campo mana_atual" },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      if (novaMana > manaMax) {
        return NextResponse.json(
          { success: false, error: `Mana não pode ultrapassar ${manaMax}.` },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      updates.mana_atual = novaMana;
    }

    const [updated, magiasRaw, periciasRaw] = await prisma.$transaction([
      prisma.personagem.update({
        where: { id },
        data: updates,
        include: {
          raca: true,
          classe: true,
        },
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
    const finalHpBase = (updated.hp_base !== null && updated.hp_base !== undefined)
      ? updated.hp_base
      : ((updated.raca?.hp ?? 0) + (updated.classe?.hp ?? 0));

    const finalManaBase = (updated.mana_base !== null && updated.mana_base !== undefined)
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
        hp: finalHpBase,
        mana: finalManaBase,
        sobre: updated.descricao ?? null,
        url_imagem: updated.url_imagem ?? null,
        imagem_pixel: updated.imagem_pixel ?? null,
        magias,
        pericias,
        statusEspecial: updated.statusEspecial ?? null,
      }
    };

    return NextResponse.json(result, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error("Erro ao atualizar personagem:", error);
    // tratamento de not found (Prisma P2025)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ success: false, error: "Personagem não encontrado." }, { status: 404 });
    }
    const message =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
