type DefesaTemporariaParams = {
  defesaAtual?: number | null;
  defesaMax?: number | null;
  valorEfeito: number;
};

function toSafeDefenseValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : 0;
}

/**
 * Soma defesa temporária oriunda de itens especiais sem perder a defesa remanescente já ativa.
 */
export function acumularDefesaTemporaria({
  defesaAtual,
  defesaMax,
  valorEfeito,
}: DefesaTemporariaParams) {
  const incremento = toSafeDefenseValue(valorEfeito);

  return {
    defesa_atual: toSafeDefenseValue(defesaAtual) + incremento,
    defesa_max: toSafeDefenseValue(defesaMax) + incremento,
  };
}
