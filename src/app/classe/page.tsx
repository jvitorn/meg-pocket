// src/app/classe/page.tsx
import React, { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ClassesListClient from "@/components/classe/classeListClient";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { LoadingSpinner } from "@/components/loadingSpinner";

export const metadata = {
  title: "Classes — M&G Pocket",
  description: "Lista de classes do RPG Magos & Grimórios",
};

/**
 * Subcomponente assíncrono (Server Component).
 * Faz a chamada ao banco e retorna o Client Component com os dados.
 */
async function ClassesFetcher() {
  const classes = await prisma.classe.findMany({
    select: {
      id: true,
      slug: true,
      nome: true,
      subtitulo: true,
      img_corpo: true,
      background: true,
      tags: true,
    },
    orderBy: { id: "asc" },
  });

  const items = classes.map((c) => ({
    id: c.id,
    slug: c.slug ?? null,
    nome: c.nome,
    subtitulo: c.subtitulo ?? null,
    img_corpo: c.img_corpo ?? null,
    background: c.background ?? null,
    tags: Array.isArray(c.tags) ? (c.tags as string[]) : [],
  }));

  return <ClassesListClient initialItems={items} />;
}

/**
 * Página (Server Component) — shell imediato + Suspense boundary
 * que engloba o componente async que acessa o banco.
 */
export default function ClassesIndexPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Classes
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Escolha uma classe para ver detalhes e magias.
            </p>
          </header>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          }
        >
          {/* componente async que faz prisma.findMany */}
          <ClassesFetcher />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
