import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { LoadingSpinner } from "@/components/loadingSpinner";
import CampanhasServer from "./server";
import { Footer } from "@/components/footer";

export default function CampanhasPage() {
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
              Explore as campanhas e mergulhe nas histórias — clique em qualquer
              campanha para ver mais detalhes.
            </p>
          </header>

          <Suspense fallback={<LoadingSpinner />}>
            <CampanhasServer />
          </Suspense>
        </div>
      </main>
      <Footer/>
    </>
  );
}
