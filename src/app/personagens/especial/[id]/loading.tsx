import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { PersonagemEspecialSkeleton } from "@/components/skeletons/personagem-especial.skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Ficha Especial
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Informações e ações do evento especial
          </p>
        </header>

        <PersonagemEspecialSkeleton />
      </main>
      <Footer />
    </>
  );
}
