import { ApiRequestError } from "@/errors/api";
import { BASEURL } from "@/services/baseUrl";
import type {
  CampaignInventoryCreatePayload,
  CampaignInventoryUpdatePayload,
  CampaignNpcFilters,
  CampaignNpcItem,
  CampaignNpcPayload,
  CampanhaStatusValue,
  CampanhaUpdatePayload,
} from "@/types/campanha";
import type {
  CombateActionPayload,
  CombateCreatePayload,
  CombateListItem,
} from "@/types/combate";

const CAMPANHAS_ROUTE = `${BASEURL}/campanhas`;

export type CampanhaMutationResponse = {
  ok?: boolean;
  campanha?: {
    id: number;
    nome: string;
    sinopse?: string | null;
    capa?: string | null;
    mestre?: string | null;
    status?: CampanhaStatusValue;
    tags?: unknown;
  };
};

async function parseJson(response: Response) {
  return response.json().catch(() => null);
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await parseJson(response);

  if (!response.ok) {
    throw new ApiRequestError(
      data?.error ?? "Não foi possível concluir a ação.",
      response.status,
      data
    );
  }

  return data as T;
}

function jsonInit(method: "POST" | "PATCH", body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function atualizarCampanha(
  campanhaId: number,
  values: CampanhaUpdatePayload
) {
  return requestJson<CampanhaMutationResponse>(
    `${CAMPANHAS_ROUTE}/${campanhaId}`,
    jsonInit("PATCH", values)
  );
}

export function criarCampanha(values: CampanhaUpdatePayload) {
  return requestJson<CampanhaMutationResponse>(
    CAMPANHAS_ROUTE,
    jsonInit("POST", values)
  );
}

export function alterarStatusCampanha(
  campanhaId: number,
  status: CampanhaStatusValue
) {
  return requestJson<CampanhaMutationResponse>(
    `${CAMPANHAS_ROUTE}/${campanhaId}`,
    jsonInit("PATCH", { status })
  );
}

export function vincularItemCampanha(
  campanhaId: number,
  payload: CampaignInventoryCreatePayload
) {
  return requestJson(
    `${CAMPANHAS_ROUTE}/${campanhaId}/inventario`,
    jsonInit("POST", payload)
  );
}

export function atualizarItemInventarioCampanha(
  campanhaId: number,
  inventoryItemId: number,
  payload: CampaignInventoryUpdatePayload
) {
  return requestJson(
    `${CAMPANHAS_ROUTE}/${campanhaId}/inventario/${inventoryItemId}`,
    jsonInit("PATCH", payload)
  );
}

export function excluirItemInventarioCampanha(
  campanhaId: number,
  inventoryItemId: number
) {
  return requestJson(`${CAMPANHAS_ROUTE}/${campanhaId}/inventario/${inventoryItemId}`, {
    method: "DELETE",
  });
}

export function gerarNpcCampanha(
  campanhaId: number,
  filtros: CampaignNpcFilters
) {
  return requestJson<{ ok: true; npc: Partial<CampaignNpcItem> }>(
    `${CAMPANHAS_ROUTE}/${campanhaId}/npcs/gerar`,
    jsonInit("POST", { filtros })
  );
}

export function refinarNarrativaNpcCampanha(
  campanhaId: number,
  npc: Partial<CampaignNpcPayload>,
  estilo: string
) {
  return requestJson<{ ok: true; descricao: string }>(
    `${CAMPANHAS_ROUTE}/${campanhaId}/npcs/refinar`,
    jsonInit("POST", { npc, estilo })
  );
}

export function salvarNpcCampanha(
  campanhaId: number,
  payload: CampaignNpcPayload,
  npcId?: number | null
) {
  const url = npcId
    ? `${CAMPANHAS_ROUTE}/${campanhaId}/npcs/${npcId}`
    : `${CAMPANHAS_ROUTE}/${campanhaId}/npcs`;

  return requestJson(url, jsonInit(npcId ? "PATCH" : "POST", payload));
}

export function excluirNpcCampanha(campanhaId: number, npcId: number) {
  return requestJson(`${CAMPANHAS_ROUTE}/${campanhaId}/npcs/${npcId}`, {
    method: "DELETE",
  });
}

export function criarCombateCampanha(
  campanhaId: number,
  payload: CombateCreatePayload
) {
  return requestJson<{ ok: true; combate: CombateListItem }>(
    `${CAMPANHAS_ROUTE}/${campanhaId}/combates`,
    jsonInit("POST", payload)
  );
}

export function executarAcaoCombateCampanha(
  campanhaId: number,
  combateId: number,
  payload: CombateActionPayload
) {
  return requestJson(`${CAMPANHAS_ROUTE}/${campanhaId}/combates/${combateId}`, {
    ...jsonInit("PATCH", payload),
  });
}

export function excluirCombateCampanha(campanhaId: number, combateId: number) {
  return requestJson(`${CAMPANHAS_ROUTE}/${campanhaId}/combates/${combateId}`, {
    method: "DELETE",
  });
}
