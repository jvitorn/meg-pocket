import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { BookOpenText, ShieldAlert, Skull } from "lucide-react";

import { AmeacasClient } from "@/components/ameacas/AmeacasClient";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { listarAmeacas } from "@/lib/ameacas";

export const metadata: Metadata = {
  title: "Ameaças — M&G Pocket",
  description:
    "Bestiário público de ameaças para campanhas de Magos & Grimórios.",
};

export const dynamic = "force-dynamic";

export default async function AmeacasPage() {
  const ameacas = await listarAmeacas();
  const totalAmeacas = ameacas.length;
  const totalTipos = new Set(ameacas.map((ameaca) => ameaca.tipo)).size;
  const maiorVa = ameacas.length > 0 ? Math.max(...ameacas.map((ameaca) => ameaca.va)) : 0;

  return (
    <>
      <Navbar />
      <main className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(239,68,68,0.12),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(20,184,166,0.1),transparent_24%),linear-gradient(180deg,#fff7ed_0%,var(--background)_34%,#fff_100%)] text-foreground dark:bg-background dark:bg-none">
        <section className="relative isolate overflow-hidden">
          <Image
            src="/imgs/backgrounds/ameacas.jpg"
            alt="Arquivo antigo de ameaças de Valthera"
            fill
            priority
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/78 via-black/58 to-black/36 dark:from-black dark:via-black/72 dark:to-black/40" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(220,38,38,0.28),transparent_26%),radial-gradient(circle_at_84%_16%,rgba(20,184,166,0.2),transparent_24%),radial-gradient(circle_at_50%_88%,rgba(245,158,11,0.16),transparent_28%)]" />

          <div className="relative z-10 mx-auto flex min-h-107.5 max-w-7xl flex-col justify-end px-4 pb-10 pt-8 sm:px-6 lg:px-8">
            <AppBreadcrumb
              className="mb-8"
              items={[
                { label: "Início", href: "/" },
                { label: "Ameaças" },
              ]}
            />

            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/35 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85 backdrop-blur">
                <Skull className="h-4 w-4 text-red-200" />
                Bestiário público
              </div>
              <h1 className="text-4xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_16px_34px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
                Ameaças
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/82 sm:text-lg">
                Criaturas, líderes e horrores prontos para consulta rápida em mesa,
                com estatísticas essenciais e ganchos narrativos.
              </p>
            </div>

            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              <HeroMetric icon={<BookOpenText className="h-4 w-4" />} label="Registros" value={totalAmeacas} />
              <HeroMetric icon={<ShieldAlert className="h-4 w-4" />} label="Tipos" value={totalTipos} />
              <HeroMetric icon={<Skull className="h-4 w-4" />} label="Maior VA" value={maiorVa} />
            </div>
          </div>
        </section>

        <AmeacasClient ameacas={ameacas} />
      </main>
      <Footer />
    </>
  );
}

function HeroMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-white/15 bg-black/35 px-4 py-3 text-white backdrop-blur-md">
      <div className="flex items-center gap-2 text-white/70">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
