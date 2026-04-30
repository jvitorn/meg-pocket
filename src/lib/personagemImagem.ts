type PersonagemImagemInput = {
  imagemPerfil?: string | null;
  imagemPrincipal?: string | null;
};

function normalizeImageUrl(value?: string | null) {
  const normalized = value?.trim();
  return normalized || "";
}

export function resolverImagemPerfilPersonagem({
  imagemPerfil,
  imagemPrincipal,
}: PersonagemImagemInput) {
  return normalizeImageUrl(imagemPerfil) || normalizeImageUrl(imagemPrincipal);
}
