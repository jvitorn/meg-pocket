import { CAMPANHAPERSONAGEMROUTE,PERSONAGEMROUTE } from "@/services/baseUrl";

export async function getPersonagensNaCampanha(id : string) {
  const res = await fetch(`${CAMPANHAPERSONAGEMROUTE}/${id}`);
  if (!res.ok) throw new Error("Erro ao buscar os personagens dessa campanha");
  return res.json();
}
/**
 * Atualiza valores de um personagem específico no Redis via rota da API
 * @param index posição do personagem no array JSON
 * @param campo nome do campo a ser atualizado (ex: 'hp_atual')
 * @param valor novo valor
 */
export async function setPersonagemValores(index: number, campo: string, valor: any) {
  try {
    const response = await fetch(`${PERSONAGEMROUTE}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, campo, valor }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Erro ao atualizar personagem:',err)
      throw new Error(`Erro ao atualizar personagem: ${err}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erro em setPersonagemValores:", error);
    throw error;
  }
}