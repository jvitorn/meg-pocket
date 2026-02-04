import { prisma } from "@/lib/prisma";
import type { CampanhaInterface } from "@/types";
import { unstable_cache } from "next/cache";

export const getCampanhas = unstable_cache(async function (): Promise<CampanhaInterface[]> {
  try {
    const rows = await prisma.campanha.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        nome: true,
        sinopse: true,
        capa: true,
        count_jogadores: true,
        mestre: true,
        tags: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      sinopse: r.sinopse ?? undefined,
      capa: r.capa ?? undefined,
      count_jogadores: r.count_jogadores ?? 0,
      mestre: r.mestre ?? "",
      tags: Array.isArray(r.tags)
        ? (r.tags as unknown as Array<unknown>).filter((t): t is string => typeof t === "string")
        : undefined,
    }));
  } catch (err) {
    console.error("Erro ao buscar campanhas no DB:", err);
    return [];
  }
}, ["campanhas"], { revalidate: 300 });
