import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Compass, Home } from "lucide-react";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página não encontrada — M&G Pocket",
  description: "A página solicitada não foi encontrada no M&G Pocket.",
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden bg-background text-foreground">
        <Image
          src="/imgs/backgrounds/bosqueTranquilo.jpg"
          alt="Bosque tranquilo ao amanhecer"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/58 dark:bg-black/64" />
        <div className="absolute inset-0 bg-linear-to-t from-black/78 via-black/42 to-black/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.20),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(245,158,11,0.16),transparent_26%)]" />

        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/25 bg-black/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-sm backdrop-blur">
              <Compass className="h-4 w-4 text-emerald-200" />
              Rota perdida
            </div>
            <h1 className="text-4xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_16px_34px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
              Página não encontrada
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/90 drop-shadow sm:text-lg">
              O caminho pode ter mudado, sido removido ou nunca ter existido no
              grimório.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Voltar ao início
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-md border-white/35 bg-black/45 text-white hover:border-white/60 hover:bg-white/15 hover:text-white active:bg-white/20"
              >
                <Link href="/ameacas">
                  <ArrowLeft className="h-4 w-4" />
                  Consultar ameaças
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
