import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { Navbar } from "@/components/navbar";
import CampanhasServer from "./server";
import { Footer } from "@/components/footer";
import { CampanhasGridSkeleton } from "@/components/skeletons/campanhas-grid.skeleton";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

export const dynamic = "force-dynamic";

export default function CampanhasPage() {
  noStore();
  return (
    <>
      <Navbar />
      <main className="min-h-screen mt-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <AppBreadcrumb
            items={[
              { label: "Início", href: "/" },
              { label: "Campanhas" },
            ]}
          />
          <header className="mb-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Campanhas Ativas
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Explore as campanhas e mergulhe nas histórias — clique em qualquer
              campanha para ver mais detalhes.
            </p>
          </header>

          <Suspense fallback={<CampanhasGridSkeleton />}>
            <CampanhasServer />
          </Suspense>
        </div>
      </main>
      <Footer/>
    </>
  );
}
