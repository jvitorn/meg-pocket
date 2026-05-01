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
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/78 to-black/50 dark:from-black dark:via-black/74 dark:to-black/58" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(220,38,38,0.26),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(245,158,11,0.18),transparent_24%)]" />

        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-end px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/35 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur">
              <ShieldAlert className="h-4 w-4 text-red-200" />
              Falha crítica
            </div>
            <h1 className="text-4xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_16px_34px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
              Algo saiu do controle
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/82 sm:text-lg">
              A tela encontrou uma falha inesperada. Você pode tentar recarregar
              esta rota ou voltar para o início.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={reset}
                className="rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                <RotateCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-md border-white/20 bg-black/25 text-white hover:bg-white/10 hover:text-white"
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
