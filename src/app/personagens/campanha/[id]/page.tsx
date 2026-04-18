import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import PersonagemCampanhaClient from "@/components/personagens/personagemCampanhaClient";
import { Footer } from "@/components/footer";
import { PersonagemCampanhaPageSkeleton } from "@/components/skeletons/personagem-campanha-page.skeleton";

export default function PersonagemCampanhaPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <Suspense fallback={<PersonagemCampanhaPageSkeleton />}>
          <PersonagemCampanhaClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
