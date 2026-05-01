import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { toPositiveInt } from "@/lib/regras/personagemCriacao";

export const NPCS_POR_CAMPANHA_LIMITE_PADRAO = 50;

export const NPC_GENEROS = ["masculino", "feminino", "neutro"] as const;
export type NpcGenero = (typeof NPC_GENEROS)[number];

export const NPC_TONS = ["classico", "simples", "sombrio", "heroico", "mistico"] as const;
export const NPC_IMPORTANCIAS = ["figurante", "contato", "aliado", "rival", "vilao"] as const;

export type NpcDraft = {
  nome: string;
  racaId: number;
  racaNome: string;
  genero: NpcGenero;
  classeId: number | null;
  classeNome: string | null;
  profissao: string | null;
  importancia: string | null;
  tom: string | null;
  personalidade: string | null;
  aparencia: string | null;
  segredo: string | null;
  objetivoCampanha: string;
  gancho: string | null;
  frase: string | null;
  relacaoComGrupo: string | null;
  detalheVisual: string | null;
  descricao: string | null;
  dadosJson?: Prisma.InputJsonValue;
};

type TemplateNpc = {
  tipo: string;
  valor: string;
  racaId: number | null;
  racaNome: string | null;
  genero: string | null;
  classeId: number | null;
  classeNome: string | null;
  profissao: string | null;
  tom: string | null;
  importancia: string | null;
  peso: number;
};

type CatalogoRaca = {
  id: number;
  nome: string;
};

type CatalogoClasse = {
  id: number;
  nome: string;
};

type GerarNpcFiltros = {
  racaId?: unknown;
  genero?: unknown;
  classeId?: unknown;
  profissao?: unknown;
  tom?: unknown;
  importancia?: unknown;
};

export class NpcCampanhaError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "NpcCampanhaError";
    this.status = status;
  }
}

export function getNpcCampanhaLimit() {
  const configured = Number(process.env.NPCS_POR_CAMPANHA_LIMITE);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : NPCS_POR_CAMPANHA_LIMITE_PADRAO;
}

export function normalizarGenero(value: unknown): NpcGenero | null {
  const genero = String(value ?? "").trim().toLowerCase();
  return NPC_GENEROS.includes(genero as NpcGenero) ? (genero as NpcGenero) : null;
}

export function isClasseNpcSelecionavel(nome: string) {
  const normalized = normalizeComparable(nome);
  return !["unico", "unica"].includes(normalized);
}

export async function prepararDadosNpcCampanha(body: unknown) {
  const payload = asRecord(body);
  const nome = requiredText(payload.nome, "Nome", 120);
  const racaId = toPositiveInt(payload.racaId);
  const genero = normalizarGenero(payload.genero);
  const objetivoCampanha = requiredText(
    payload.objetivoCampanha ?? payload.objetivo_campanha,
    "Objetivo na campanha",
    1000
  );

  if (!racaId) {
    throw new NpcCampanhaError("Raça é obrigatória.");
  }

  if (!genero) {
    throw new NpcCampanhaError("Gênero é obrigatório.");
  }

  const raca = await prisma.raca.findUnique({
    where: { id: racaId },
    select: { id: true, nome: true },
  });

  if (!raca) {
    throw new NpcCampanhaError("Raça não encontrada.", 404);
  }

  const classeId = toPositiveInt(payload.classeId);
  const classe = classeId
    ? await prisma.classe.findUnique({
        where: { id: classeId },
        select: { id: true, nome: true },
      })
    : null;

  const classeValida = classe && isClasseNpcSelecionavel(classe.nome) ? classe : null;

  return {
    nome,
    racaId: raca.id,
    racaNome: raca.nome,
    genero,
    classeId: classeValida?.id ?? null,
    classeNome: classeValida?.nome ?? null,
    profissao: optionalText(payload.profissao, 160),
    importancia: optionalText(payload.importancia, 80),
    tom: optionalText(payload.tom, 80),
    personalidade: optionalText(payload.personalidade, 600),
    aparencia: optionalText(payload.aparencia, 600),
    segredo: optionalText(payload.segredo, 600),
    objetivoCampanha,
    gancho: optionalText(payload.gancho, 800),
    frase: optionalText(payload.frase, 300),
    relacaoComGrupo: optionalText(payload.relacaoComGrupo ?? payload.relacao_com_grupo, 500),
    detalheVisual: optionalText(payload.detalheVisual ?? payload.detalhe_visual, 500),
    descricao: optionalText(payload.descricao, 3000),
    dadosJson: normalizeJson(payload.dadosJson ?? payload.dados_json),
  };
}

export async function gerarNpcProcedural(filtros: GerarNpcFiltros = {}) {
  const [racas, classes, templates, estiloClassico] = await prisma.$transaction([
    prisma.raca.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.classe.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.npcTemplateGeracao.findMany({
      where: { ativo: true },
      select: {
        tipo: true,
        valor: true,
        racaId: true,
        racaNome: true,
        genero: true,
        classeId: true,
        classeNome: true,
        profissao: true,
        tom: true,
        importancia: true,
        peso: true,
      },
    }),
    prisma.npcEstiloNarrativo.findFirst({
      where: { chave: "classico", ativo: true },
      select: { template: true },
    }),
  ]);

  if (racas.length === 0) {
    throw new NpcCampanhaError("Nenhuma raça encontrada para gerar NPC.", 400);
  }

  const classesValidas = classes.filter((classe) => isClasseNpcSelecionavel(classe.nome));
  const racaEscolhida = pickRaca(racas, filtros.racaId);
  const genero = normalizarGenero(filtros.genero) ?? randomItem([...NPC_GENEROS]);
  const classeEscolhida = pickClasse(classesValidas, filtros.classeId);
  const tom = optionalText(filtros.tom, 80) ?? randomItem([...NPC_TONS]);
  const importancia = optionalText(filtros.importancia, 80) ?? randomItem([...NPC_IMPORTANCIAS]);

  const contextBase = {
    raca: racaEscolhida,
    genero,
    classe: classeEscolhida,
    tom,
    importancia,
  };
  const profissao =
    optionalText(filtros.profissao, 160) ??
    pickTemplateValue("profissao", templates, contextBase) ??
    "morador local";
  const nomeBase =
    pickTemplateValue("nome", templates, { ...contextBase, profissao }) ?? "Pessoa sem Nome";
  const sobrenome = pickTemplateValue("sobrenome", templates, {
    ...contextBase,
    profissao,
  });
  const nome = sobrenome && Math.random() > 0.2 ? `${nomeBase} ${sobrenome}` : nomeBase;

  const npc: NpcDraft = {
    nome,
    racaId: racaEscolhida.id,
    racaNome: racaEscolhida.nome,
    genero,
    classeId: classeEscolhida?.id ?? null,
    classeNome: classeEscolhida?.nome ?? null,
    profissao,
    importancia,
    tom,
    personalidade:
      pickTemplateValue("personalidade", templates, { ...contextBase, profissao }) ??
      "reservado e atento ao que acontece ao redor",
    aparencia:
      pickTemplateValue("aparencia", templates, { ...contextBase, profissao }) ??
      "possui uma presença discreta e fácil de reconhecer",
    segredo:
      pickTemplateValue("segredo", templates, { ...contextBase, profissao }) ??
      "guarda um segredo que ainda não revelou",
    objetivoCampanha:
      pickTemplateValue("objetivo_campanha", templates, { ...contextBase, profissao }) ??
      "encontrar um lugar seguro dentro dos eventos da campanha",
    gancho:
      pickTemplateValue("gancho", templates, { ...contextBase, profissao }) ??
      "procura ajuda para resolver um problema urgente",
    frase:
      pickTemplateValue("frase", templates, { ...contextBase, profissao }) ??
      "Nem toda história começa com uma escolha.",
    relacaoComGrupo:
      pickTemplateValue("relacao_com_grupo", templates, { ...contextBase, profissao }) ??
      "observa os aventureiros antes de confiar neles",
    detalheVisual:
      pickTemplateValue("detalhe_visual", templates, { ...contextBase, profissao }) ??
      "um pequeno amuleto gasto pelo tempo",
    descricao: null,
    dadosJson: {
      origem: "procedural",
      filtros: normalizeJson(filtros) ?? {},
    },
  };

  npc.descricao = aplicarTemplateNarrativo(estiloClassico?.template, npc);
  return npc;
}

export async function refinarNarrativaNpc(npc: Partial<NpcDraft>, estiloChave: unknown) {
  const chave = optionalText(estiloChave, 80) ?? "classico";
  const estilo =
    (await prisma.npcEstiloNarrativo.findFirst({
      where: { chave, ativo: true },
      select: { template: true },
    })) ??
    (await prisma.npcEstiloNarrativo.findFirst({
      where: { chave: "classico", ativo: true },
      select: { template: true },
    }));

  if (!estilo) {
    throw new NpcCampanhaError("Nenhum estilo narrativo ativo foi encontrado.", 400);
  }

  return aplicarTemplateNarrativo(estilo.template, npc);
}

export function aplicarTemplateNarrativo(template: string | null | undefined, npc: Partial<NpcDraft>) {
  const genero = normalizarGenero(npc.genero) ?? "neutro";
  const gramatica = getGramaticaGenero(genero);
  const replacements: Record<string, string> = {
    nome: safeText(npc.nome, "NPC"),
    raca: safeText(npc.racaNome, "pessoa de origem indefinida"),
    genero,
    classe: safeText(npc.classeNome, "sem classe definida"),
    profissao: safeText(npc.profissao, "ocupação incerta"),
    personalidade: safeText(npc.personalidade, "reservado"),
    aparencia: safeText(npc.aparencia, "possui uma presença discreta"),
    segredo: safeText(npc.segredo, "guarda um segredo que ainda não revelou"),
    objetivo_campanha: safeText(npc.objetivoCampanha, "encontrar seu lugar na campanha"),
    gancho: safeText(npc.gancho, "cruza o caminho do grupo em busca de ajuda"),
    frase: safeText(npc.frase, "Ainda há muito que vocês não sabem."),
    relacao_com_grupo: safeText(npc.relacaoComGrupo, "observa o grupo com cautela"),
    detalhe_visual: safeText(npc.detalheVisual, "um detalhe visual marcante"),
    artigo: gramatica.artigo,
    artigoMaiusculo: gramatica.artigoMaiusculo,
    pronome: gramatica.pronome,
  };

  return (template ?? "{{nome}} é {{artigo}} {{raca}}.").replace(
    /\{\{([a-zA-Z_]+)\}\}/g,
    (_, key: string) => replacements[key] ?? ""
  );
}

function pickRaca(racas: CatalogoRaca[], value: unknown) {
  const racaId = toPositiveInt(value);
  if (!racaId) return randomItem(racas);

  const raca = racas.find((item) => item.id === racaId);
  if (!raca) {
    throw new NpcCampanhaError("Raça não encontrada.", 404);
  }
  return raca;
}

function pickClasse(classes: CatalogoClasse[], value: unknown) {
  const classeId = toPositiveInt(value);
  if (classeId) {
    return classes.find((item) => item.id === classeId) ?? null;
  }

  if (classes.length === 0 || Math.random() < 0.35) {
    return null;
  }

  return randomItem(classes);
}

function pickTemplateValue(
  tipo: string,
  templates: TemplateNpc[],
  context: {
    raca: CatalogoRaca;
    genero: NpcGenero;
    classe: CatalogoClasse | null;
    profissao?: string | null;
    tom?: string | null;
    importancia?: string | null;
  }
) {
  const candidates = templates.filter(
    (template) => template.tipo === tipo && templateMatches(template, context)
  );
  const generic = templates.filter(
    (template) => template.tipo === tipo && templateIsGeneric(template)
  );

  return weightedRandom(candidates.length > 0 ? candidates : generic)?.valor ?? null;
}

function templateMatches(
  template: TemplateNpc,
  context: {
    raca: CatalogoRaca;
    genero: NpcGenero;
    classe: CatalogoClasse | null;
    profissao?: string | null;
    tom?: string | null;
    importancia?: string | null;
  }
) {
  if (template.racaId && template.racaId !== context.raca.id) return false;
  if (template.racaNome && normalizeComparable(template.racaNome) !== normalizeComparable(context.raca.nome)) {
    return false;
  }
  if (template.genero && template.genero !== context.genero) return false;
  if (template.classeId && template.classeId !== context.classe?.id) return false;
  if (
    template.classeNome &&
    normalizeComparable(template.classeNome) !== normalizeComparable(context.classe?.nome ?? "")
  ) {
    return false;
  }
  if (
    template.profissao &&
    normalizeComparable(template.profissao) !== normalizeComparable(context.profissao ?? "")
  ) {
    return false;
  }
  if (template.tom && template.tom !== context.tom) return false;
  if (template.importancia && template.importancia !== context.importancia) return false;

  return true;
}

function templateIsGeneric(template: TemplateNpc) {
  return (
    !template.racaId &&
    !template.racaNome &&
    !template.genero &&
    !template.classeId &&
    !template.classeNome &&
    !template.profissao &&
    !template.tom &&
    !template.importancia
  );
}

function weightedRandom<T extends { peso: number }>(items: T[]) {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + Math.max(1, item.peso), 0);
  let roll = Math.random() * total;

  for (const item of items) {
    roll -= Math.max(1, item.peso);
    if (roll <= 0) return item;
  }

  return items[items.length - 1];
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requiredText(value: unknown, label: string, maxLength: number) {
  const text = optionalText(value, maxLength);
  if (!text) {
    throw new NpcCampanhaError(`${label} é obrigatório.`);
  }
  return text;
}

function optionalText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  if (text.length > maxLength) {
    throw new NpcCampanhaError(`Campo excede o limite de ${maxLength} caracteres.`);
  }

  return text;
}

function safeText(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeComparable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;

  try {
    JSON.stringify(value);
  } catch {
    return undefined;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    (typeof value === "object" && value !== null)
  ) {
    return value as Prisma.InputJsonValue;
  }

  return undefined;
}

function getGramaticaGenero(genero: NpcGenero) {
  if (genero === "masculino") {
    return { artigo: "um", artigoMaiusculo: "Um", pronome: "ele" };
  }

  if (genero === "feminino") {
    return { artigo: "uma", artigoMaiusculo: "Uma", pronome: "ela" };
  }

  return { artigo: "uma figura", artigoMaiusculo: "Uma figura", pronome: "essa pessoa" };
}
