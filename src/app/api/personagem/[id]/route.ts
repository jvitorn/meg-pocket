// app/personagens/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { Elemento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getOptionalSessionUserId,
  validarEdicaoDaFicha,
} from "@/lib/regras/personagemPermissao";
import {
  montarResumoInventario,
  normalizarItemInventario,
} from "@/lib/personagemInventario";
import {
  resolverBaseAtributo,
  resolverLimitesPersonagem,
} from "@/lib/personagemAtributos";
import {
  calcularQuantidadeObrigatoriaPericias,
  isValidExternalUrl,
  normalizePericiaTipo,
  PERSONAGEM_PERICIA_PONTUACAO_INICIAL,
  toPositiveInt,
} from "@/lib/regras/personagemCriacao";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
} from "@/lib/security/rate-limit";
import { revalidateCampanhasData } from "@/lib/cache/revalidate";

const allowedElements = new Set(["natureza", "agua", "fogo", "vento"]);

export async function GET(
  _request: NextRequest,
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

    const sessionUserId = await getOptionalSessionUserId();
    const canEdit =
      !!sessionUserId &&
      !!personagem.userId &&
      personagem.userId === sessionUserId;

    const [magiaPersonagem, periciaPersonagem, inventarioRaw] =
      await Promise.all([
        prisma.magiaPersonagem.findMany({
          where: { personagemId },
          include: { magia: true },
        }),
        prisma.periciaPersonagem.findMany({
          where: { personagemId },
          include: { pericia: true },
        }),
        prisma.itemInventario.findMany({
          where: { personagemId },
          include: { item: { include: { efeito: true } } },
          orderBy: [{ createdAt: "asc" }],
        }),
      ]);

    const hpBase = resolverBaseAtributo({
      basePersistida: personagem.hp_base,
      baseDerivada: (personagem.raca?.hp ?? 0) + (personagem.classe?.hp ?? 0),
    });
    const manaBase = resolverBaseAtributo({
      basePersistida: personagem.mana_base,
      baseDerivada:
        (personagem.raca?.mana ?? 0) + (personagem.classe?.mana ?? 0),
    });

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

    const inventario = (inventarioRaw ?? [])
      .map(normalizarItemInventario)
      .filter((item) => item !== null);
    const inventarioResumo = montarResumoInventario(inventario);

    const result = {
      id: personagem.id,
      nome: personagem.nome,
      apelido: personagem.apelido ?? null,
      campanhaId: personagem.campanhaId,
      classeId: personagem.classeId,
      classe_nome: personagem.classe?.nome ?? null,
      racaId: personagem.racaId,
      raca_nome: personagem.raca?.nome ?? null,
      corTema: personagem.raca?.corTema ?? null,
      habilidadeDiariaNome: personagem.raca?.habilidadeDiariaNome ?? null,
      habilidadeDiariaCombate: personagem.raca?.habilidadeDiariaCombate ?? null,
      habilidadeDiariaForaDeCombate:
        personagem.raca?.habilidadeDiariaForaDeCombate ?? null,
      habilidadeDiariaUsada: personagem.habilidadeDiariaUsada,
      elemento: personagem.elemento,
      hp_atual: personagem.hp_atual ?? null,
      mana_atual: personagem.mana_atual ?? null,
      defesa_atual: personagem.defesa_atual ?? 0,
      defesa_max: personagem.defesa_max ?? 0,
      hp: hpBase,
      mana: manaBase,
      sobre: personagem.descricao ?? null,
      anotacoes: personagem.anotacoes ?? null,
      imagemPrincipal: personagem.imagemPrincipal ?? null,
      imagemPerfil: personagem.imagemPerfil ?? null,
      magias,
      pericias,
      inventario,
      inventarioResumo,
      statusEspecial: personagem.statusEspecial ?? null,

      // 🔥 NOVO — Slots defensivos
      slotsDefensivos: personagem.slotsDefensivos
        ? {
            esquivaUsada: personagem.slotsDefensivos.esquivaUsada,
            bloqueioUsado: personagem.slotsDefensivos.bloqueioUsado,
            contraAtaqueUsado:
              personagem.slotsDefensivos.contraAtaqueUsado,
          }
        : null,
      canEdit,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personagemId = Number(id);

    if (Number.isNaN(personagemId) || !Number.isInteger(personagemId) || personagemId <= 0) {
      return NextResponse.json(
        { success: false, error: "ID do personagem inválido" },
        { status: 400 }
      );
    }

    const permissao = await validarEdicaoDaFicha(personagemId);
    if (!permissao.ok) {
      return NextResponse.json(
        { success: false, error: permissao.error },
        { status: permissao.status }
      );
    }

    const rateLimit = await enforceRateLimit(request, {
      key: "personagem:delete",
      limit: 10,
      windowMs: 60_000,
      identifier: permissao.userId,
    });

    const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Muitas exclusões em sequência. Aguarde alguns instantes.",
        },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.magiaPersonagem.deleteMany({ where: { personagemId } }),
        tx.periciaPersonagem.deleteMany({ where: { personagemId } }),
        tx.itemInventario.deleteMany({ where: { personagemId } }),
        tx.slotsDefensivos.deleteMany({ where: { personagemId } }),
      ]);

      await tx.personagem.delete({
        where: { id: personagemId },
      });
    });

    revalidateCampanhasData();

    return NextResponse.json(
      { success: true },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("Erro ao deletar personagem:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao deletar personagem." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personagemId = Number(id);

    if (Number.isNaN(personagemId) || !Number.isInteger(personagemId) || personagemId <= 0) {
      return NextResponse.json(
        { success: false, error: "ID do personagem inválido" },
        { status: 400 }
      );
    }

    const permissao = await validarEdicaoDaFicha(personagemId);
    if (!permissao.ok) {
      return NextResponse.json(
        { success: false, error: permissao.error },
        { status: permissao.status }
      );
    }

    const rateLimit = await enforceRateLimit(request, {
      key: "personagem:sheet:edit",
      limit: 10,
      windowMs: 60_000,
      identifier: permissao.userId,
    });

    const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Muitas alterações completas em sequência. Aguarde alguns instantes.",
        },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const body = await request.json();
    const nome = String(body?.nome ?? "").trim();
    const apelido = String(body?.apelido ?? "").trim();
    const descricao = String(body?.descricao ?? "").trim();
    const hasAnotacoes = Object.prototype.hasOwnProperty.call(
      body ?? {},
      "anotacoes"
    );
    const anotacoes = String(body?.anotacoes ?? "").replace(/\r\n/g, "\n");
    const urlImagem = String(body?.imagemPrincipal ?? "").trim();
    const elemento = String(body?.elemento ?? "").trim().toLowerCase() as Elemento;

    const campanhaId = toPositiveInt(body?.campanhaId);
    const classeId = toPositiveInt(body?.classeId);
    const racaId = toPositiveInt(body?.racaId);
    const rawPericiaIds: unknown[] = Array.isArray(body?.periciaIds)
      ? body.periciaIds
      : [];
    const parsedPericiaIds = rawPericiaIds.map((value) => toPositiveInt(value));
    const hasInvalidPericiaId = parsedPericiaIds.some((value) => value === null);
    const periciaIds = Array.from(
      new Set(parsedPericiaIds.filter((value): value is number => value !== null))
    );
    const rawMagiaIds: unknown[] = Array.isArray(body?.magiaIds) ? body.magiaIds : [];
    const parsedMagiaIds = rawMagiaIds.map((value) => toPositiveInt(value));
    const hasInvalidMagiaId = parsedMagiaIds.some((value) => value === null);
    const magiaIds = Array.from(
      new Set(parsedMagiaIds.filter((value): value is number => value !== null))
    );

    if (!nome) {
      return NextResponse.json(
        { success: false, error: "Nome do personagem é obrigatório." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (
      nome.length > 80 ||
      apelido.length > 80 ||
      descricao.length > 2000 ||
      (hasAnotacoes && anotacoes.length > 20000)
    ) {
      return NextResponse.json(
        { success: false, error: "Dados do personagem excedem o limite permitido." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!campanhaId || !classeId || !racaId) {
      return NextResponse.json(
        { success: false, error: "Campanha, classe e raça são obrigatórias." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!allowedElements.has(elemento)) {
      return NextResponse.json(
        { success: false, error: "Elemento inválido." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (urlImagem && !isValidExternalUrl(urlImagem)) {
      return NextResponse.json(
        { success: false, error: "URL da imagem inválida." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (hasInvalidMagiaId) {
      return NextResponse.json(
        { success: false, error: "Lista de magias inválida." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (hasInvalidPericiaId) {
      return NextResponse.json(
        { success: false, error: "Lista de perícias inválida." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (magiaIds.length > 3) {
      return NextResponse.json(
        { success: false, error: "Você pode selecionar no máximo 3 magias." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const [personagemAtual, campanha, classe, raca, periciasCatalogo] =
      await prisma.$transaction([
        prisma.personagem.findUnique({
          where: { id: personagemId },
          select: {
            id: true,
            hp_atual: true,
            mana_atual: true,
            statusEspecial: true,
          },
        }),
        prisma.campanha.findUnique({ where: { id: campanhaId } }),
        prisma.classe.findUnique({
          where: { id: classeId },
          select: {
            id: true,
            hp: true,
            mana: true,
            Magias: {
              select: { id: true },
            },
          },
        }),
        prisma.raca.findUnique({ where: { id: racaId } }),
        prisma.periciaCatalog.findMany({
          select: {
            id: true,
            tipo: true,
          },
        }),
      ]);

    if (!personagemAtual) {
      return NextResponse.json(
        { success: false, error: "Personagem não encontrado." },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    if (!campanha) {
      return NextResponse.json(
        { success: false, error: "Campanha não encontrada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (campanha.status !== "ATIVA") {
      return NextResponse.json(
        {
          success: false,
          error: "Esta campanha está encerrada e não aceita alterações de ficha.",
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!classe) {
      return NextResponse.json(
        { success: false, error: "Classe não encontrada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!raca) {
      return NextResponse.json(
        { success: false, error: "Raça não encontrada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const periciasPorId = new Map(periciasCatalogo.map((pericia) => [pericia.id, pericia]));
    const tiposPericiaDisponiveis = new Set(
      periciasCatalogo.map((pericia) => normalizePericiaTipo(pericia.tipo))
    );
    const requiredPericiasCount =
      periciasCatalogo.length > 0
        ? calcularQuantidadeObrigatoriaPericias(
            tiposPericiaDisponiveis.size,
            periciasCatalogo.length
          )
        : 0;

    if (requiredPericiasCount === 0 && periciaIds.length > 0) {
      return NextResponse.json(
        { success: false, error: "Não há perícias disponíveis para seleção." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (
      requiredPericiasCount > 0 &&
      (periciaIds.length < 1 || periciaIds.length > requiredPericiasCount)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            requiredPericiasCount === 1
              ? "Selecione 1 perícia para continuar."
              : `Selecione de 1 a ${requiredPericiasCount} perícias para continuar.`,
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const periciaNaoEncontrada = periciaIds.some((periciaId) => !periciasPorId.has(periciaId));
    if (periciaNaoEncontrada) {
      return NextResponse.json(
        { success: false, error: "Perícia não encontrada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const magiaIdsDaClasse = new Set(classe.Magias.map((magia) => magia.id));
    const magiaInvalida = magiaIds.some((magiaId) => !magiaIdsDaClasse.has(magiaId));
    if (magiaInvalida) {
      return NextResponse.json(
        { success: false, error: "Existe magia que não pertence à classe selecionada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (classe.Magias.length > 0 && magiaIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selecione ao menos 1 magia da classe." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const hpBase = (raca.hp ?? 0) + (classe.hp ?? 0);
    const manaBase = (raca.mana ?? 0) + (classe.mana ?? 0);
    const limites = resolverLimitesPersonagem({
      hpBasePersistida: hpBase,
      manaBasePersistida: manaBase,
      hpDerivado: hpBase,
      manaDerivado: manaBase,
      hpAtual: personagemAtual.hp_atual,
      manaAtual: personagemAtual.mana_atual,
      statusEspecial: personagemAtual.statusEspecial,
    });

    const personagem = await prisma.personagem.update({
      where: { id: personagemId },
      data: {
        nome,
        apelido: apelido || null,
        descricao: descricao || null,
        ...(hasAnotacoes
          ? {
              anotacoes: anotacoes.trim() ? anotacoes : null,
            }
          : {}),
        campanhaId,
        classeId,
        racaId,
        elemento,
        imagemPrincipal: urlImagem || null,
        hp_base: hpBase,
        mana_base: manaBase,
        hp_atual: Math.min(personagemAtual.hp_atual ?? limites.hpMax, limites.hpMax),
        mana_atual: Math.min(
          personagemAtual.mana_atual ?? limites.manaMax,
          limites.manaMax
        ),
        magiaPersonagem: {
          deleteMany: {},
          ...(magiaIds.length > 0
            ? {
                create: magiaIds.map((magiaId) => ({
                  magiaId,
                })),
              }
            : {}),
        },
        periciaPersonagem: {
          deleteMany: {},
          ...(periciaIds.length > 0
            ? {
                create: periciaIds.map((periciaId) => ({
                  periciaId,
                  pontuacao: PERSONAGEM_PERICIA_PONTUACAO_INICIAL,
                })),
              }
            : {}),
        },
      },
      select: { id: true },
    });

    revalidateCampanhasData();

    return NextResponse.json(
      { success: true, id: personagem.id },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("Erro ao atualizar ficha completa:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao atualizar personagem." },
      { status: 500 }
    );
  }
}
