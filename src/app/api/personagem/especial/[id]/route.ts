import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarEdicaoDaFicha } from "@/lib/regras/personagemPermissao";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
} from "@/lib/security/rate-limit";
import {
  calcularAtributosEspeciais,
  getAcoesEspeciaisPadrao,
  parseStatusEspecial,
  type AcaoEspecial,
} from "@/lib/regras/personagemEspecial";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personagemId = Number(id);

    if (Number.isNaN(personagemId)) {
      return NextResponse.json(
        { error: "ID do personagem inválido" },
        { status: 400 }
      );
    }

    const permissao = await validarEdicaoDaFicha(personagemId);
    if (!permissao.ok) {
      return NextResponse.json(
        { error: permissao.error },
        {
          status: permissao.status,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const rateLimit = await enforceRateLimit(request, {
      key: "personagem:especial:get",
      limit: 30,
      windowMs: 60_000,
      identifier: permissao.userId,
    });

    const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Muitas requisições. Aguarde alguns instantes." },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const personagem = await prisma.personagem.findUnique({
      where: { id: personagemId },
      include: {
        raca: true,
        classe: true,
        especial: true,
        slotsDefensivos: true,
      },
    });

    if (!personagem) {
      return NextResponse.json(
        { error: "Personagem não encontrado" },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    const statusEspecial = parseStatusEspecial(personagem.statusEspecial) ?? "vivo";

    const hpBase = (personagem.raca?.hp ?? 0) + (personagem.classe?.hp ?? 0);
    const manaBase = (personagem.raca?.mana ?? 0) + (personagem.classe?.mana ?? 0);

    const especialRecord = personagem.especial ?? null;

    let actions: AcaoEspecial[] = [];

    if (especialRecord && statusEspecial) {
      const roleActions = await prisma.especialRoleAction.findMany({
        where: {
          especialId: especialRecord.id,
          tipo: statusEspecial,
        },
        orderBy: { id: "asc" },
      });

      for (const roleAction of roleActions) {
        try {
          const parsed = Array.isArray(roleAction.acoes)
            ? roleAction.acoes
            : JSON.parse(String(roleAction.acoes ?? "[]"));

          if (Array.isArray(parsed)) {
            actions = actions.concat(parsed as AcaoEspecial[]);
          }
        } catch {
          console.warn(
            "EspecialRoleAction parse failed for id",
            roleAction.id
          );
        }
      }
    }

    if (actions.length === 0) {
      actions = getAcoesEspeciaisPadrao(statusEspecial);
    }

    const magiaPersonagem = await prisma.magiaPersonagem.findMany({
      where: { personagemId },
      include: { magia: true },
    });

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

    const periciaPersonagem = await prisma.periciaPersonagem.findMany({
      where: { personagemId },
      include: { pericia: true },
    });

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

    const { hpMax, manaMax } = calcularAtributosEspeciais({
      hpBase,
      manaBase,
      statusEspecial,
    });

    let apelido = personagem.apelido;
    let sobre = personagem.descricao;

    if (statusEspecial === "killer") {
      apelido = "O Mascarado";
      sobre =
        "A máscara não esconde seu rosto, mas consome sua alma. O que era sede de vingança tornou-se sede de sangue, e cada vida que ele ceifa alimenta a maldição que um dia jurou controlar. A linha entre o vingador e o monstro se desfez para sempre.";
    }

    const response = {
      id: personagem.id,
      nome: apelido && apelido.trim() !== "" ? apelido : personagem.nome,
      apelido: apelido ?? null,
      campanhaId: personagem.campanhaId,
      raca_nome: personagem.raca?.nome ?? null,
      classe_nome: personagem.classe?.nome ?? null,
      racaId: personagem.racaId,
      classeId: personagem.classeId,
      statusEspecial,
      hp: hpMax,
      mana: manaMax,
      hp_base: hpBase,
      mana_base: manaBase,
      hp_atual: personagem.hp_atual ?? null,
      mana_atual: personagem.mana_atual ?? null,
      sobre: sobre ?? null,
      url_imagem: personagem.url_imagem ?? null,
      imagem_pixel: personagem.imagem_pixel ?? null,
      actions,
      magias,
      pericias,
      slotsDefensivos: personagem.slotsDefensivos
        ? {
            esquivaUsada: personagem.slotsDefensivos.esquivaUsada,
            bloqueioUsado: personagem.slotsDefensivos.bloqueioUsado,
            contraAtaqueUsado:
              personagem.slotsDefensivos.contraAtaqueUsado,
          }
        : null,
      canEdit: true,
      especial: especialRecord
        ? { id: especialRecord.id, nome: especialRecord.nome }
        : null,
    };

    return NextResponse.json(response, {
      headers: {
        ...rateLimitHeaders,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao buscar personagem especial:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
