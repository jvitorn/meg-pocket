import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const rateLimit = await enforceRateLimit(request, {
      key: "personagem:create",
      limit: 10,
      windowMs: 60_000,
      identifier: session.user.id,
    });

    const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Muitas tentativas. Aguarde e tente novamente." },
        { status: 429, headers: rateLimitHeaders }
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
    const rawPericiaIds: unknown[] = Array.isArray(body?.periciaIds)
      ? body.periciaIds
      : body?.periciaId !== null && body?.periciaId !== undefined
        ? [body.periciaId]
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
        { ok: false, error: "Nome do personagem é obrigatório." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (nome.length > 80 || apelido.length > 80 || descricao.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "Dados do personagem excedem o limite permitido." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!campanhaId || !classeId || !racaId) {
      return NextResponse.json(
        { ok: false, error: "Campanha, classe e raça são obrigatórias." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!allowedElements.has(elemento)) {
      return NextResponse.json(
        { ok: false, error: "Elemento inválido." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (urlImagem && !isValidExternalUrl(urlImagem)) {
      return NextResponse.json(
        { ok: false, error: "URL da imagem inválida." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (hasInvalidMagiaId) {
      return NextResponse.json(
        { ok: false, error: "Lista de magias inválida." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (hasInvalidPericiaId) {
      return NextResponse.json(
        { ok: false, error: "Lista de perícias inválida." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (magiaIds.length > 3) {
      return NextResponse.json(
        { ok: false, error: "Você pode selecionar no máximo 3 magias." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const [campanha, classe, raca, periciasCatalogo] = await prisma.$transaction([
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

    if (!campanha) {
      return NextResponse.json(
        { ok: false, error: "Campanha não encontrada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!classe) {
      return NextResponse.json(
        { ok: false, error: "Classe não encontrada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!raca) {
      return NextResponse.json(
        { ok: false, error: "Raça não encontrada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const periciasPorId = new Map(periciasCatalogo.map((pericia) => [pericia.id, pericia]));
    const tiposPericiaDisponiveis = new Set(
      periciasCatalogo.map((pericia) => normalizePericiaTipo(pericia.tipo))
    );
    const requiredPericiasCount =
      periciasCatalogo.length > 0
        ? calcularQuantidadeObrigatoriaPericias(tiposPericiaDisponiveis.size)
        : 0;

    if (requiredPericiasCount === 0 && periciaIds.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Não há perícias disponíveis para seleção." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (requiredPericiasCount > 0 && periciaIds.length !== requiredPericiasCount) {
      return NextResponse.json(
        {
          ok: false,
          error: `Selecione ${requiredPericiasCount} ${
            requiredPericiasCount === 1 ? "perícia" : "perícias"
          } para continuar.`,
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const periciaNaoEncontrada = periciaIds.some((periciaId) => !periciasPorId.has(periciaId));
    if (periciaNaoEncontrada) {
      return NextResponse.json(
        { ok: false, error: "Perícia não encontrada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const tiposSelecionados = new Set<string>();
    for (const periciaId of periciaIds) {
      const pericia = periciasPorId.get(periciaId);
      const tipo = normalizePericiaTipo(pericia?.tipo);
      if (tiposSelecionados.has(tipo)) {
        return NextResponse.json(
          { ok: false, error: "Selecione no máximo 1 perícia por tipo." },
          { status: 400, headers: rateLimitHeaders }
        );
      }
      tiposSelecionados.add(tipo);
    }

    const magiaIdsDaClasse = new Set(classe.Magias.map((magia) => magia.id));
    const magiaInvalida = magiaIds.some((magiaId) => !magiaIdsDaClasse.has(magiaId));
    if (magiaInvalida) {
      return NextResponse.json(
        { ok: false, error: "Existe magia que não pertence à classe selecionada." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (classe.Magias.length > 0 && magiaIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Selecione ao menos 1 magia da classe." },
        { status: 400, headers: rateLimitHeaders }
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
        defesa_atual: 0,
        defesa_max: 0,
        userId: session.user.id,
        slotsDefensivos: {
          create: {},
        },
        magiaPersonagem:
          magiaIds.length > 0
            ? {
                create: magiaIds.map((magiaId) => ({
                  magiaId,
                })),
              }
            : undefined,
        periciaPersonagem:
          periciaIds.length > 0
            ? {
                create: periciaIds.map((periciaId) => ({
                  periciaId,
                  pontuacao: PERSONAGEM_PERICIA_PONTUACAO_INICIAL,
                })),
              }
            : undefined,
      },
    });

    revalidateCampanhasData();

    return NextResponse.json(
      { ok: true, id: personagem.id },
      { status: 201, headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("Erro ao criar personagem:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
