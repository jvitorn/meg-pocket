import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ValidarEdicaoFichaResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 | 404; error: string };

export async function getSessionUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function getOptionalSessionUserId() {
  try {
    return await getSessionUserId();
  } catch (error) {
    console.error("Erro ao consultar sessão opcional:", error);
    return null;
  }
}

export async function validarEdicaoDaFicha(
  personagemId: number
): Promise<ValidarEdicaoFichaResult> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { ok: false, status: 401, error: "Usuário não autenticado." };
  }

  const personagem = await prisma.personagem.findUnique({
    where: { id: personagemId },
    select: { userId: true },
  });

  if (!personagem) {
    return { ok: false, status: 404, error: "Personagem não encontrado." };
  }

  if (!personagem.userId || personagem.userId !== userId) {
    return {
      ok: false,
      status: 403,
      error: "Sem permissão para editar esta ficha.",
    };
  }

  return { ok: true, userId };
}
