/* -------------------------------------------------------
   Erros do sistema de Slots Defensivos
---------------------------------------------------------*/

/** Tipos de slots defensivos válidos */
export type SlotTipo = "esquiva" | "bloqueio" | "contra";

/** Códigos de erro possíveis */
export const SlotErrorCode = {
  NAO_CONFIGURADO: "NAO_CONFIGURADO",
  LIMITE_ATINGIDO: "LIMITE_ATINGIDO",
} as const;

export type SlotErrorCode =
  (typeof SlotErrorCode)[keyof typeof SlotErrorCode];

/** Estrutura padrão de erro de slot */
export interface SlotError {
  code: SlotErrorCode;
  tipo?: SlotTipo;
}

/* -------------------------------------------------------
   Mensagens padrão (backend / logs)
---------------------------------------------------------*/
export const SlotErrorMessages: Record<SlotErrorCode, string> = {
  NAO_CONFIGURADO:
    "Slots defensivos não configurados para o personagem.",

  LIMITE_ATINGIDO:
    "Limite do slot defensivo atingido.",
};
