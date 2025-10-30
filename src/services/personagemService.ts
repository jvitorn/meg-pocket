import { CAMPANHAPERSONAGEMROUTE } from "@/services/baseUrl";

export async function getPersonagensNaCampanha(id : string) {
  const res = await fetch(`${CAMPANHAPERSONAGEMROUTE}/${id}`);
  if (!res.ok) throw new Error("Erro ao buscar os personagens dessa campanha");
  return res.json();
}
