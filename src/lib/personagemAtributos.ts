import {
  calcularAtributosEspeciais,
  parseStatusEspecial,
} from "@/lib/regras/personagemEspecial";

type ResolverBaseParams = {
  basePersistida?: number | null;
  baseDerivada?: number | null;
};

type ResolverLimitesParams = {
  hpBasePersistida?: number | null;
  manaBasePersistida?: number | null;
  hpDerivado?: number | null;
  manaDerivado?: number | null;
  hpAtual?: number | null;
  manaAtual?: number | null;
  statusEspecial?: string | null;
};

function numeroValido(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function resolverBaseAtributo({
  basePersistida,
  baseDerivada,
}: ResolverBaseParams) {
  const candidatos = [basePersistida, baseDerivada].filter(
    (value): value is number => numeroValido(value)
  );

  if (candidatos.length === 0) {
    return 0;
  }

  return Math.max(...candidatos);
}

export function resolverLimitesPersonagem({
  hpBasePersistida,
  manaBasePersistida,
  hpDerivado,
  manaDerivado,
  hpAtual,
  manaAtual,
  statusEspecial,
}: ResolverLimitesParams) {
  const hpBaseEfetivo = resolverBaseAtributo({
    basePersistida: hpBasePersistida,
    baseDerivada: hpDerivado,
  });
  const manaBaseEfetivo = resolverBaseAtributo({
    basePersistida: manaBasePersistida,
    baseDerivada: manaDerivado,
  });
  const statusEspecialNormalizado = parseStatusEspecial(statusEspecial);
  const { hpMax, manaMax } = calcularAtributosEspeciais({
    hpBase: hpBaseEfetivo,
    manaBase: manaBaseEfetivo,
    statusEspecial: statusEspecialNormalizado,
  });

  const hpAtualSeguro =
    typeof hpAtual === "number" && Number.isFinite(hpAtual) && hpAtual >= 0
      ? hpAtual
      : 0;
  const manaAtualSeguro =
    typeof manaAtual === "number" &&
    Number.isFinite(manaAtual) &&
    manaAtual >= 0
      ? manaAtual
      : 0;

  return {
    hpBaseEfetivo,
    manaBaseEfetivo,
    hpMax,
    manaMax,
    hpMaxSeguro: Math.max(hpMax, hpAtualSeguro),
    manaMaxSeguro: Math.max(manaMax, manaAtualSeguro),
    statusEspecial: statusEspecialNormalizado,
  };
}
