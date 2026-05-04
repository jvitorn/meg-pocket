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
      <main className="relative isolate min-h-screen overflow-hidden px-4 py-10 md:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_12%,rgba(217,119,6,0.16),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(20,184,166,0.13),transparent_24%),radial-gradient(circle_at_50%_88%,rgba(99,102,241,0.1),transparent_28%),linear-gradient(180deg,#fffbeb_0%,var(--background)_42%,#fff_100%)] dark:bg-[radial-gradient(circle_at_14%_12%,rgba(217,119,6,0.12),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(20,184,166,0.1),transparent_24%),linear-gradient(180deg,rgba(12,10,9,0.98)_0%,var(--background)_45%,var(--background)_100%)]" />
        <div className="pointer-events-none absolute left-6 top-24 -z-10 h-48 w-48 rounded-full border border-amber-500/20 bg-amber-500/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-24 right-8 -z-10 h-64 w-64 rounded-full border border-emerald-500/20 bg-emerald-500/10 blur-3xl" />
        <div className="max-w-7xl mx-auto">
          <AppBreadcrumb
            items={[
              { label: "Início", href: "/" },
              { label: "Campanhas" },
            ]}
          />
          <header className="mb-8 rounded-2xl border border-border/70 bg-card/80 px-4 py-8 text-center shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-400">
              Arquivo de mesas
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">
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
