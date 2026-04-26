import React, { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

import RacaListClient from "@/components/raca/racaListClient";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { RacaListSkeleton } from "@/components/skeletons/raca-list.skeleton";
import { resolveColorThemeName } from "@/lib/utils";
import type { RacaInterface } from "@/types";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

export const metadata = {
  title: "Raças — M&G Pocket",
  description: "Lista de raças do RPG Magos & Grimórios",
};

async function RacaFetcher() {
  noStore();
  const racas = await prisma.raca.findMany({
    select: {
      id: true,
      nome: true,
      descricao: true,
      hp: true,
      mana: true,
      img: true,
      icone: true,
      corTema: true,
      habilidadeDiariaNome: true,
      habilidadeDiariaCombate: true,
      habilidadeDiariaForaDeCombate: true,
    },
    orderBy: { id: "asc" },
  });

  const transformedRacas: RacaInterface[] = racas.map((raca) => ({
    id: raca.id,
    nome: raca.nome,
    descricao: raca.descricao ?? undefined,
    hp: raca.hp ?? 0,
    mana: raca.mana ?? 0,
    img: raca.img ?? undefined,
    icone: raca.icone ?? undefined,
    corTema: resolveColorThemeName(raca.corTema),
    habilidadeDiariaNome: raca.habilidadeDiariaNome ?? undefined,
    habilidadeDiariaCombate: raca.habilidadeDiariaCombate ?? undefined,
    habilidadeDiariaForaDeCombate: raca.habilidadeDiariaForaDeCombate ?? undefined,
  }));

  return <RacaListClient initialItems={transformedRacas} />;
}

export default function RacaIndexPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AppBreadcrumb
          items={[
            { label: "Início", href: "/" },
            { label: "Raças" },
          ]}
        />
        <Suspense fallback={<RacaListSkeleton />}>
          <RacaFetcher />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
