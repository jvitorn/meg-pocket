import { PericiaPersonagem } from "@/types";

/* =======================================================
   Tipos de Slots Defensivos
   -------------------------------------------------------
   - esquiva       → reação para evitar dano completamente
   - bloqueio      → reação para reduzir dano físico
   - contra        → reação ofensiva (sempre limitada)
======================================================= */
export type SlotDefensivoTipo = "esquiva" | "bloqueio" | "contra";

/* =======================================================
   Mapeamento de perícias que afetam cada slot
   -------------------------------------------------------
   IMPORTANTE:
   - A regra é feita por NOME da perícia
   - Não depende de ID nem de banco
   - Facilita ajuste futuro e leitura das regras
======================================================= */
const PERICIAS_RELEVANTES = {
  esquiva: "Atletismo & Condicionamento Físico",
  bloqueio: "Combate",
} as const;

/* =======================================================
   Limites base dos slots
   -------------------------------------------------------
   - Sem perícia → limite reduzido
   - Com perícia → limite maior
   - Contra-ataque é sempre fixo
======================================================= */
const LIMITES = {
  SEM_PERICIA: 1,
  COM_PERICIA: 3,
  CONTRA_FIXO: 1,
} as const;

/* =======================================================
   Funções utilitárias
======================================================= */
/**
 * Normaliza o nome de uma perícia para comparação segura.
 *
 * Motivo:
 * - Evita erros por acentuação
 * - Evita diferenças entre "&" e "e"
 * - Evita problemas com maiúsculas/minúsculas
 * - Torna a regra estável mesmo se o texto mudar levemente
 */
function normalizarNomePericia(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/&/g, "e")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica se o personagem possui determinada perícia,
 * comparando pelo nome normalizado.
 *
 * @param pericias Lista de perícias do personagem
 * @param nomePericia Nome da perícia esperada (forma canônica)
 * @returns true se a perícia existir no personagem
 */
function possuiPericia(
  pericias: PericiaPersonagem[],
  nomePericia: string
): boolean {
  const nomeNormalizado = normalizarNomePericia(nomePericia);
  return pericias.some(
    (p) => normalizarNomePericia(p.nome) === nomeNormalizado
  );
}

/* =======================================================
   Função principal de regra de negócio
======================================================= */
/**
 * Calcula o limite máximo de uso de um slot defensivo
 * para um personagem, baseado em suas perícias.
 *
 * REGRA:
 * - Esquiva:
 *    • Sem Atletismo & Condicionamento Físico → LIMITES.SEM_PERICIA
 *    • Com Atletismo & Condicionamento Físico → LIMITES.COM_PERICIA
 *
 * - Bloqueio Físico:
 *    • Sem Combate → LIMITES.SEM_PERICIA
 *    • Com Combate → LIMITES.COM_PERICIA
 *
 * - Contra-ataque:
 *    • Sempre 1 uso por combate
 *
 * @param tipo Tipo do slot defensivo
 * @param pericias Lista de perícias do personagem
 * @returns Limite máximo permitido para o slot
 */
export function calcularLimiteSlotsDefensivos(
  tipo: SlotDefensivoTipo,
  pericias: PericiaPersonagem[]
): number {
  switch (tipo) {
    case "esquiva": {
      const temPericia = possuiPericia(
        pericias,
        PERICIAS_RELEVANTES.esquiva
      );
      return temPericia
        ? LIMITES.COM_PERICIA
        : LIMITES.SEM_PERICIA;
    }

    case "bloqueio": {
      const temPericia = possuiPericia(
        pericias,
        PERICIAS_RELEVANTES.bloqueio
      );

      return temPericia
        ? LIMITES.COM_PERICIA
        : LIMITES.SEM_PERICIA;
    }

    case "contra":
      return LIMITES.CONTRA_FIXO;

    default:
      // Segurança: se algo inesperado acontecer
      return 0;
  }
}
