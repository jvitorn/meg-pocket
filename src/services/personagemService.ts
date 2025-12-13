import {
  CAMPANHAPERSONAGEMROUTE,
  PERSONAGEMROUTE,
} from "@/services/baseUrl";

import type {
  SlotError,
  SlotTipo,
} from "@/errors/slotsDefensivos";

/* -------------------------------------------------------
   Personagens na campanha
---------------------------------------------------------*/
/**
 * Busca todos os personagens vinculados a uma campanha
 */
export async function getPersonagensNaCampanha(id: number) {
  const res = await fetch(`${CAMPANHAPERSONAGEMROUTE}/${id}`);
  if (!res.ok) {
    throw new Error("Erro ao buscar os personagens da campanha");
  }
  return res.json();
}

/* -------------------------------------------------------
   Atualização genérica de personagem
---------------------------------------------------------*/
/**
 * Atualiza um campo simples do personagem
 *
 * Usado para HP, Mana e outros valores diretos.
 *
 * @param index ID do personagem
 * @param campo Nome do campo (ex: hp_atual, mana_atual)
 * @param valor Novo valor
 */
export async function setPersonagemValores(
  index: number,
  campo: string,
  valor: any
) {
  const response = await fetch(`${PERSONAGEMROUTE}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index, campo, valor }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  return response.json();
}

/* -------------------------------------------------------
   Slots Defensivos
---------------------------------------------------------*/
/**
 * Usa um slot defensivo do personagem.
 *
 * A API valida:
 * - existência do personagem
 * - limite por tipo de slot
 * - regras de perícia
 *
 * @param personagemId ID do personagem
 * @param tipo Tipo de slot (esquiva | bloqueio | contra)
 *
 * @throws SlotError Erro de regra de negócio retornado pela API
 */
export async function usarSlotDefensivo(
  personagemId: number,
  tipo: SlotTipo
) {
  const res = await fetch(
    `${PERSONAGEMROUTE}/${personagemId}/slots/${tipo}`,
    { method: "POST" }
  );

  if (!res.ok) {
    const data = await res.json();
    throw data.error as SlotError;
  }

  return res.json();
}

/**
 * Reseta todos os slots defensivos do personagem.
 *
 * Usado ao final de um combate.
 *
 * @param personagemId ID do personagem
 */
export async function resetarSlotsDefensivos(
  personagemId: number
) {
  const res = await fetch(
    `${PERSONAGEMROUTE}/${personagemId}/slots/reset`,
    { method: "POST" }
  );

  if (!res.ok) {
    throw new Error("Erro ao resetar slots defensivos");
  }

  return res.json();
}
