import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { PersonagemCampanhaPageSkeleton } from "@/components/skeletons/personagem-campanha-page.skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PersonagemCampanhaPageSkeleton />
      </main>
      <Footer />
    </>
  );
}
