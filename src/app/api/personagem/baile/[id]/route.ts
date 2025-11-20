// src/app/api/personagens/baile/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ActionItem = { nome: string; descricao: string; custo_mana?: number };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idParam = id;
    const personagemId = Number(idParam);
    if (Number.isNaN(personagemId)) {
      return NextResponse.json({ error: "ID do personagem inválido" }, { status: 400 });
    }
    // buscar personagem com relações mínimas
    const personagem = await prisma.personagem.findUnique({
      where: { id: personagemId },
      include: {
        raca: true,
        classe: true,
        baile: true, 
      },
    });

    if (!personagem) {
      return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }
    // garantia de status_baile
    const statusBaile = personagem.status_baile ?? "vivo";

    // calcula hp/mana base (fallback raca+classe)
    const hpBase = ((personagem.raca?.hp ?? 0) + (personagem.classe?.hp ?? 0));
    const manaBase = ((personagem.raca?.mana ?? 0) + (personagem.classe?.mana ?? 0));
    // Determinar o baile ativo:
    // 1) se personagem.baileId estiver setado, usamos esse baile
    // 2) senão, tentamos pegar o baile mais recente cujo nome contenha 'baile' (heurística)
    let baileRecord = personagem.baile ?? null;
    if (!baileRecord) {
      baileRecord = await prisma.baile.findFirst({
        where: { nome: { contains: "baile", mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });
    }
    // Buscar ações definidas para o tipo do personagem (por classe -> por raça -> default)
    let actions: ActionItem[] = [];

    if (baileRecord) {
      // Se o personagem NÃO tem status no baile, não pesquisamos nada
      if (!statusBaile || String(statusBaile).trim() === "") {
        actions = []; // mantém vazio — o fallback posterior tratará o caso
      } else {
        // Busca apenas as ações do tipo igual ao status_baile (ex: 'killer' ou 'morto')
        const roleActions = await prisma.baileRoleAction.findMany({
          where: {
            baileId: baileRecord.id,
            tipo: statusBaile,
          },
          orderBy: { id: "asc" }, // ordem de preferência (opcional)
        });

        for (const ra of roleActions) {
          try {
            const parsed = Array.isArray(ra.acoes) ? ra.acoes : JSON.parse(String(ra.acoes ?? "[]"));
            if (Array.isArray(parsed)) {
              actions = actions.concat(parsed as ActionItem[]);
            }
          } catch (e) {
            console.warn("BaileRoleAction parse failed for id", ra.id);
          }
        }
      }
    }

    // Se não houver ações definidas no DB, aplica fallback baseado no status_baile
    if (!actions || actions.length === 0) {
      switch (statusBaile) {
        case "killer":
          actions = [
            {
              nome: "Ocultar Presença",
              descricao:
                "O Killer se funde às sombras e torna-se invisível por 2 turnos ou até atacar. Durante esse estado, não pode ser alvo de magias, ataques ou detecção. Inimigos a até 5 metros devem realizar um teste de Vontade (CD 12) ou ficam Amedrontados por 1 turno.",
              custo_mana: 5,
            },
            {
              nome: "Golpe Sombrio",
              descricao:
                "Ataque físico mortal imbuído com energia das trevas. Causa 7 de dano direto (9 se alvo amedrontado) e aplica Sangramento Leve (1d4 por 1d3 rodadas). Se usado logo após Ocultar Presença, torna-se Golpe Fatal (teste CD 14 para incapacitar).",
              custo_mana: 10,
            },
            {
              nome: "Execução Silenciosa",
              descricao:
                "Ataque supremo: instakill condicional (só válido se o alvo estiver amedrontado, incapacitado ou com <50% vida). Caso contrário causa 9 de dano. Só pode ser usado uma vez por sessão.",
              custo_mana: 30,
            },
          ];
          break;
        case "morto":
          actions = [
            { nome: "Sussurro do Além", descricao: "Sussurra para os vivos, interferindo temporariamente nas suas ações.", custo_mana: 5 },
            { nome: "Travessia Etérea", descricao: "Permite atravessar objetos físicos por alguns instantes.", custo_mana: 8 },
          ];
          break;
        case "vivo":
        default:
          actions = []; // vivo não tem ações por padrão
          break;
      }
    }

    // Busca vínculos separadamente (evita usar nomes de relações que não existem no include do client)
    const magiaPersonagem = await prisma.magiaPersonagem.findMany({
      where: { personagemId: personagemId },
      include: { magia: true },
    });
    // Map magias: prioriza overrides do vínculo (MagiaPersonagem), senão usa MagiaCatalog
    const magias = (magiaPersonagem ?? []).map(mp => {
      const catalog = mp.magia;
      return {
        nome: catalog?.nome ?? null,
        alcance: mp.descricao && !catalog?.alcance ? null : (mp.descricao ? (catalog?.alcance ?? null) : (catalog?.alcance ?? null)),
        // Prioriza descricao do vínculo se houver, senão do catalog
        descricao: mp.descricao ?? catalog?.descricao ?? '',
        // Prioriza custo_nivel do vínculo, senão do catalog
        custo_nivel: mp.custo_nivel ?? catalog?.custo_nivel ?? null,
      };
    }).filter(m => m.nome !== null);

    const periciaPersonagem = await prisma.periciaPersonagem.findMany({
      where: { personagemId: personagemId },
      include: { pericia: true },
    });
    // Map pericias: junta info do catálogo com pontuação do vínculo
    const pericias = (periciaPersonagem ?? []).map(pp => {
      const catalog = pp.pericia;
      return {
        nome: catalog?.nome ?? null,
        tipo: catalog?.tipo ?? '',
        pontuacao: pp.pontuacao ?? 0,
        descricao: pp.descricao ?? catalog?.descricao ?? '',
      };
    }).filter(p => p.nome !== null);

    // Ajustes especiais: se status_baile === 'killer' multiplica hp/mana como na lógica antiga
    let hpFinal = hpBase;
    let manaFinal = manaBase;
    if (statusBaile === "killer") {
      hpFinal = hpFinal * 5;
      manaFinal = manaFinal * 5;
      personagem.apelido = "O Mascarado";
      personagem.descricao = "A máscara não esconde seu rosto, mas consome sua alma. O que era sede de vingança tornou-se sede de sangue, e cada vida que ele ceifa alimenta a maldição que um dia jurou controlar. A linha entre o vingador e o monstro se desfez para sempre.";
    } else if (statusBaile === "morto") {
      hpFinal = 0;
      manaFinal = Math.floor(manaFinal * 0.5);
    }

    const response = {
      id: personagem.id,
      nome: (personagem.apelido && personagem.apelido.trim() !== "") ? personagem.apelido : personagem.nome,
      apelido: personagem.apelido ?? null,
      raca_nome: personagem.raca?.nome ?? null,
      classe_nome: personagem.classe?.nome ?? null,
      raca_id: personagem.racaId,
      classe_id: personagem.classeId,
      status_baile: statusBaile,
      hp: hpFinal,
      mana: manaFinal,
      hp_base: hpBase,
      mana_base: manaBase,
      hp_atual: personagem.hp_atual ?? null,
      mana_atual: personagem.mana_atual ?? null,
      sobre: personagem.descricao ?? null,
      url_imagem: personagem.url_imagem ?? null,
      imagem_pixel: personagem.imagem_pixel ?? null,
      actions,
      magias,
      pericias,
      baile: baileRecord ? { id: baileRecord.id, nome: baileRecord.nome } : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar personagem no baile:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
