// src/app/api/personagem/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarEdicaoDaFicha } from "@/lib/regras/personagemPermissao";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
} from "@/lib/security/rate-limit";
import { resolverLimitesPersonagem } from "@/lib/personagemAtributos";
import {
  montarResumoInventario,
  normalizarItemInventario,
} from "@/lib/personagemInventario";

type Body = {
  index?: number | string; // aqui deve vir o ID (pk) do personagem
  campo: string;
  valor: unknown;
};

const allowedFields = new Set(["sobre", "hp_atual", "mana_atual", "defesa_atual"]);

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

    const hpDerivado =
      (personagemAtual.raca?.hp ?? 0) + (personagemAtual.classe?.hp ?? 0);
    const manaDerivado =
      (personagemAtual.raca?.mana ?? 0) + (personagemAtual.classe?.mana ?? 0);
    const {
      hpBaseEfetivo,
      manaBaseEfetivo,
      hpMaxSeguro,
      manaMaxSeguro,
    } = resolverLimitesPersonagem({
      hpBasePersistida: personagemAtual.hp_base,
      manaBasePersistida: personagemAtual.mana_base,
      hpDerivado,
      manaDerivado,
      hpAtual: personagemAtual.hp_atual,
      manaAtual: personagemAtual.mana_atual,
      statusEspecial: personagemAtual.statusEspecial,
    });

    const updates: {
      descricao?: string;
      hp_atual?: number;
      mana_atual?: number;
      defesa_atual?: number;
      defesa_max?: number;
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

      if (novoHp > hpMaxSeguro) {
        return NextResponse.json(
          { success: false, error: `HP não pode ultrapassar ${hpMaxSeguro}.` },
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

      if (novaMana > manaMaxSeguro) {
        return NextResponse.json(
          { success: false, error: `Mana não pode ultrapassar ${manaMaxSeguro}.` },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      updates.mana_atual = novaMana;
    }

    if (campo === "defesa_atual") {
      const novaDefesa = parseNonNegativeInteger(valor);

      if (novaDefesa === null) {
        return NextResponse.json(
          { success: false, error: "Valor numérico inválido para campo defesa_atual" },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      const defesaMaxAtual = personagemAtual.defesa_max ?? 0;

      if (novaDefesa > defesaMaxAtual) {
        return NextResponse.json(
          { success: false, error: `Defesa não pode ultrapassar ${defesaMaxAtual}.` },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      updates.defesa_atual = novaDefesa;

      if (novaDefesa === 0) {
        updates.defesa_max = 0;
      }
    }

    const [updated, magiasRaw, periciasRaw, inventarioRaw] = await prisma.$transaction(async (tx) => {
      const updatedPersonagem = await tx.personagem.update({
        where: { id },
        data: updates,
        include: {
          raca: true,
          classe: true,
        },
      });

      if (campo === "defesa_atual" && (updates.defesa_atual ?? 0) === 0) {
        await tx.itemInventario.updateMany({
          where: {
            personagemId: id,
            efeitoAtivo: true,
            durabilidadeAtual: {
              gt: 0,
            },
          },
          data: {
            efeitoAtivo: false,
          },
        });

        await tx.itemInventario.updateMany({
          where: {
            personagemId: id,
            efeitoAtivo: true,
            OR: [
              {
                durabilidadeAtual: 0,
              },
              {
                durabilidadeAtual: null,
              },
            ],
          },
          data: {
            efeitoAtivo: false,
            esgotadoEm: new Date(),
          },
        });
      }

      const [magias, pericias] = await Promise.all([
        tx.magiaPersonagem.findMany({
          where: { personagemId: id },
          include: { magia: true },
        }),
        tx.periciaPersonagem.findMany({
          where: { personagemId: id },
          include: { pericia: true },
        }),
      ]);

      const inventario =
        campo === "defesa_atual" && (updates.defesa_atual ?? 0) === 0
          ? await tx.itemInventario.findMany({
              where: { personagemId: id },
              include: { item: { include: { efeito: true } } },
              orderBy: [{ createdAt: "asc" }],
            })
          : null;

      return [updatedPersonagem, magias, pericias, inventario] as const;
    });

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
    const inventario =
      inventarioRaw?.map(normalizarItemInventario).filter((item) => item !== null) ?? null;
    const inventarioResumo = inventario
      ? montarResumoInventario(inventario)
      : null;

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
        defesa_atual: updated.defesa_atual ?? 0,
        defesa_max: updated.defesa_max ?? 0,
        hp: hpBaseEfetivo,
        mana: manaBaseEfetivo,
        sobre: updated.descricao ?? null,
        url_imagem: updated.url_imagem ?? null,
        imagem_pixel: updated.imagem_pixel ?? null,
        magias,
        pericias,
        statusEspecial: updated.statusEspecial ?? null,
      },
      ...(inventario
        ? {
            inventario,
            inventarioResumo,
          }
        : {}),
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
