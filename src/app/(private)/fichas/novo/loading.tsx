import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { PersonagemCreateFormSkeleton } from "@/components/skeletons/personagem-create-form.skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background text-foreground">
        <div className="h-1 w-full bg-linear-to-r from-amber-400 via-emerald-400 to-sky-500" />

        <section className="bg-linear-to-b from-muted/40 via-background to-background">
          <div className="w-full px-4 py-10 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Nova ficha
              </p>
              <h1 className="text-3xl font-bold md:text-4xl">
                Criar ficha
              </h1>
            </div>

            <div className="mt-6">
              <PersonagemCreateFormSkeleton />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
