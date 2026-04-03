import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { ClassesListSkeleton } from "@/components/skeletons/classes-list.skeleton";

export default function Loading() {
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

        <ClassesListSkeleton />
      </main>
      <Footer />
    </>
  );
}
