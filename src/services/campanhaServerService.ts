import { prisma } from "@/lib/prisma";
import type { CampanhaInterface } from "@/types/campanha";

export async function getCampanhas(): Promise<CampanhaInterface[]> {
  const rows = await prisma.campanha.findMany({
    where: { status: "ATIVA" },
    orderBy: { id: "asc" },
    select: {
      id: true,
      nome: true,
      sinopse: true,
      capa: true,
      count_jogadores: true,
      mestre: true,
      status: true,
      tags: true,
      _count: {
        select: { personagens: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    sinopse: r.sinopse ?? undefined,
    capa: r.capa ?? undefined,
    count_jogadores: r._count.personagens,
    mestre: r.mestre ?? "",
    status: r.status,
    tags: Array.isArray(r.tags)
      ? (r.tags as unknown as Array<unknown>).filter(
          (t): t is string => typeof t === "string"
        )
      : undefined,
  }));
}
