import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function validarMestreDaCampanha(campanhaId: number) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return {
      ok: false as const,
      status: 401,
      error: "Usuário não autenticado.",
      userId: null,
      campanha: null,
    };
  }

  const campanha = await prisma.campanha.findUnique({
    where: { id: campanhaId },
    select: {
      id: true,
      nome: true,
      sinopse: true,
      capa: true,
      mestre: true,
      tags: true,
      userId: true,
    },
  });

  if (!campanha) {
    return {
      ok: false as const,
      status: 404,
      error: "Campanha não encontrada.",
      userId,
      campanha: null,
    };
  }

  if (campanha.userId !== userId) {
    return {
      ok: false as const,
      status: 403,
      error: "Apenas o mestre que criou esta campanha pode editar esses dados.",
      userId,
      campanha,
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: null,
    userId,
    campanha,
  };
}
