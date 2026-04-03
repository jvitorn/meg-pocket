export const STATUS_ESPECIAIS = ["vivo", "morto", "killer"] as const;

export type StatusEspecial = (typeof STATUS_ESPECIAIS)[number];

export type AcaoEspecial = {
  nome: string;
  descricao: string;
  custo_mana?: number;
};

export function parseStatusEspecial(value: unknown): StatusEspecial | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;

  return STATUS_ESPECIAIS.includes(normalized as StatusEspecial)
    ? (normalized as StatusEspecial)
    : null;
}

export function calcularAtributosEspeciais(params: {
  hpBase: number;
  manaBase: number;
  statusEspecial: StatusEspecial | null;
}) {
  const { hpBase, manaBase, statusEspecial } = params;

  if (statusEspecial === "killer") {
    return {
      hpMax: hpBase * 5,
      manaMax: manaBase * 5,
    };
  }

  if (statusEspecial === "morto") {
    return {
      hpMax: 0,
      manaMax: Math.floor(manaBase * 0.5),
    };
  }

  return {
    hpMax: hpBase,
    manaMax: manaBase,
  };
}

export function getAcoesEspeciaisPadrao(
  statusEspecial: StatusEspecial | null
): AcaoEspecial[] {
  switch (statusEspecial) {
    case "killer":
      return [
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
    case "morto":
      return [
        {
          nome: "Sussurro do Além",
          descricao:
            "Sussurra para os vivos, interferindo temporariamente nas suas ações.",
          custo_mana: 5,
        },
        {
          nome: "Travessia Etérea",
          descricao:
            "Permite atravessar objetos físicos por alguns instantes.",
          custo_mana: 8,
        },
      ];
    default:
      return [];
  }
}
