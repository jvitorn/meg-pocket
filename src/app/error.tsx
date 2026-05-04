"use client";

import Image from "next/image";
import Link from "next/link";
import { Home, RotateCcw, ShieldAlert } from "lucide-react";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Navbar />
      <main className="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden bg-background text-foreground">
        <Image
          src="/imgs/backgrounds/destruicaoTemplo.jpg"
          alt="Templo destruído por magia instável"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/62 dark:bg-black/68" />
        <div className="absolute inset-0 bg-linear-to-t from-black/82 via-black/46 to-black/34" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(220,38,38,0.24),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(245,158,11,0.16),transparent_26%)]" />

        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/25 bg-black/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-sm backdrop-blur">
              <ShieldAlert className="h-4 w-4 text-red-200" />
              Falha crítica
            </div>
            <h1 className="text-4xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_16px_34px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
              Algo saiu do controle
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/90 drop-shadow sm:text-lg">
              A tela encontrou uma falha inesperada. Você pode tentar recarregar
              esta rota ou voltar para o início.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={reset}
                className="rounded-md bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
              >
                <RotateCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-md border-white/35 bg-black/45 text-white hover:border-white/60 hover:bg-white/15 hover:text-white active:bg-white/20"
              >
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Voltar ao início
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
