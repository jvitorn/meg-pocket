import { Suspense } from "react";
import PersonagemClient from "@/components/personagens/personagemClient";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PersonagemFichaSkeleton } from "@/components/skeletons/personagem-ficha.skeleton";

export default function PersonagemPage() {
  return (
    <>
      <Navbar />
      <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
        <Suspense fallback={<PersonagemFichaSkeleton />}>
          <PersonagemClient />
        </Suspense>
      </main>

      <Footer />
    </>
  );
}
