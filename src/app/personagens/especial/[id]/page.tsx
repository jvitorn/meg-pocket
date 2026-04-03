import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import PersonagemEspecialClient from "@/components/personagens/personagemEspecialClient";
import { Footer } from "@/components/footer";
import { PersonagemEspecialSkeleton } from "@/components/skeletons/personagem-especial.skeleton";

export default function PersonagemEspecialPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Ficha Especial
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Informações e ações do evento especial
          </p>
        </header>
        <Suspense fallback={<PersonagemEspecialSkeleton />}>
          <PersonagemEspecialClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
