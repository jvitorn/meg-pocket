import { BookOpenText, Home } from "lucide-react";
import Link from "next/link";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

export default function ManualNotFound() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section className="flex min-h-[48vh] items-center justify-center rounded-[1.6rem] border border-border/70 bg-card/80 p-6 text-center shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]">
          <div className="max-w-2xl">
            <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl border border-amber-600/25 bg-amber-600/10 text-amber-700 dark:text-amber-600">
              <BookOpenText className="size-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Manual
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
              Pagina do manual nao encontrada
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              O conteudo pode ter mudado de edicao, ainda nao ter sido
              publicado ou estar em outro capitulo.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="rounded-md">
                <Link href="/manual/essencial">
                  <BookOpenText className="size-4" />
                  Manual Essencial
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-md">
                <Link href="/">
                  <Home className="size-4" />
                  Inicio
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
