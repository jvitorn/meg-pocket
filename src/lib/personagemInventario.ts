import type {
  InventarioResumo,
  ItemTipo,
  PersonagemInventarioItem,
} from "@/types";

export const INVENTARIO_SLOTS_MAXIMOS = 5;

export const ITEM_TIPO_LABEL: Record<ItemTipo, string> = {
  ARMA: "Arma",
  CONSUMIVEL: "Consumível",
  MAGICO: "Mágico",
  MATERIAL: "Material",
  EQUIPAMENTO: "Equipamento",
};

type ItemInventarioRecord = {
  id: number;
  quantidade: number;
  durabilidadeAtual: number | null;
  durabilidadeMax: number | null;
  efeitoAtivo: boolean;
  esgotadoEm: Date | string | null;
  observacoes: string | null;
  item: {
    id: number;
    nome: string;
    tipo: ItemTipo;
    descricao: string | null;
    notacaoRolagem: string | null;
    slots: number;
    durabilidadeBase: number | null;
    durabilidadeMax: number | null;
    efeito?: {
      modulo: "VIDA" | "MANA" | "DEFESA";
      operacao: "ADICIONAR" | "REMOVER";
      valor: number;
    } | null;
  } | null;
};

function roundSlots(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizarSlotsItem(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return roundSlots(value);
}

export function normalizarQuantidadeItem(value: number | null | undefined) {
  if (value === 0) {
    return 0;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.max(1, Math.trunc(value));
}

export function calcularSlotsTotaisItem(slots: number, quantidade: number) {
  if (quantidade <= 0) {
    return 0;
  }

  return roundSlots(normalizarSlotsItem(slots) * normalizarQuantidadeItem(quantidade));
}

export function normalizarItemInventario(
  entry: ItemInventarioRecord
): PersonagemInventarioItem | null {
  if (!entry.item) return null;

  const quantidade = normalizarQuantidadeItem(entry.quantidade);
  const slots = normalizarSlotsItem(entry.item.slots);
  const esgotado = Boolean(entry.esgotadoEm) || quantidade === 0;
  const itemComEfeitoUsavel = Boolean(entry.item.efeito);
  const durabilidadeMax =
    itemComEfeitoUsavel
      ? 1
      : (entry.durabilidadeMax ??
        entry.item.durabilidadeMax ??
        entry.item.durabilidadeBase);
  const durabilidadeAtual =
    itemComEfeitoUsavel
      ? Math.min(1, Math.max(0, entry.durabilidadeAtual ?? 1))
      : (entry.durabilidadeAtual ??
        entry.item.durabilidadeBase ??
        durabilidadeMax);

  return {
    id: entry.id,
    itemId: entry.item.id,
    nome: entry.item.nome,
    tipo: entry.item.tipo,
    descricao: entry.item.descricao,
    notacaoRolagem: entry.item.notacaoRolagem,
    slots,
    slotsTotal: esgotado ? 0 : calcularSlotsTotaisItem(slots, quantidade),
    quantidade,
    durabilidadeAtual,
    durabilidadeMax,
    efeitoAtivo: entry.efeitoAtivo,
    esgotado,
    efeito: entry.item.efeito
      ? {
          modulo: entry.item.efeito.modulo,
          operacao: entry.item.efeito.operacao,
          valor: entry.item.efeito.valor,
        }
      : null,
    observacoes: entry.observacoes,
  };
}

export function montarResumoInventario(
  itens: PersonagemInventarioItem[]
): InventarioResumo {
  const itensAtivos = itens.filter((item) => !item.esgotado);
  const slotsOcupados = roundSlots(
    itensAtivos.reduce((acc, item) => acc + item.slotsTotal, 0)
  );

  return {
    slotsMaximos: INVENTARIO_SLOTS_MAXIMOS,
    slotsOcupados,
    slotsDisponiveis: Math.max(
      0,
      roundSlots(INVENTARIO_SLOTS_MAXIMOS - slotsOcupados)
    ),
    itensTotais: itensAtivos.reduce((acc, item) => acc + item.quantidade, 0),
  };
}
