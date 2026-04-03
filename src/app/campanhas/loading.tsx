import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { CampanhasGridSkeleton } from "@/components/skeletons/campanhas-grid.skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen mt-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Campanhas Ativas
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Explore as campanhas e mergulhe nas histórias.
            </p>
          </header>

          <CampanhasGridSkeleton />
        </div>
      </main>
      <Footer />
    </>
  );
}
