"use client";

import Link from "next/link";
import {
  BookOpen,
  FileText,
  Github,
  Home,
  Lock,
  ScrollText,
  Shield,
  Sparkles,
} from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-muted/20 px-6 py-10 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="font-display text-xl font-bold text-amber-600 md:text-2xl dark:text-amber-700">
            MAGOS &<br />GRIMÓRIOS
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Ferramenta open source para fichas, campanhas e consultas do sistema
            Magos & Grimórios.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:min-w-md">
          <nav className="grid gap-2 text-sm [&_svg]:text-amber-600 dark:[&_svg]:text-amber-700">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-700">
              Produto
            </p>
            <Link href="/" className="inline-flex items-center gap-2 text-foreground/80 transition hover:text-amber-700 dark:hover:text-amber-600">
              <Home className="h-4 w-4" />
              Início
            </Link>
            <Link href="/campanhas" className="inline-flex items-center gap-2 text-foreground/80 transition hover:text-amber-700 dark:hover:text-amber-600">
              <ScrollText className="h-4 w-4" />
              Campanhas
            </Link>
            <Link href="/classe" className="inline-flex items-center gap-2 text-foreground/80 transition hover:text-amber-700 dark:hover:text-amber-600">
              <Shield className="h-4 w-4" />
              Classes
            </Link>
            <Link href="/raca" className="inline-flex items-center gap-2 text-foreground/80 transition hover:text-amber-700 dark:hover:text-amber-600">
              <Sparkles className="h-4 w-4" />
              Raças
            </Link>
          </nav>

          <nav className="grid gap-2 text-sm [&_svg]:text-amber-600 dark:[&_svg]:text-amber-700">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-700">
              Projeto
            </p>
            <Link href="/termos" className="inline-flex items-center gap-2 text-foreground/80 transition hover:text-amber-700 dark:hover:text-amber-600">
              <FileText className="h-4 w-4" />
              Termos
            </Link>
            <Link href="/privacidade" className="inline-flex items-center gap-2 text-foreground/80 transition hover:text-amber-700 dark:hover:text-amber-600">
              <Lock className="h-4 w-4" />
              Privacidade
            </Link>
            <Link href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" className="inline-flex items-center gap-2 text-foreground/80 transition hover:text-amber-700 dark:hover:text-amber-600">
              <BookOpen className="h-4 w-4" />
              Conteúdo aberto
            </Link>
            <Link
              href="https://github.com/jvitorn/meg-pocket"
              target="_blank"
              className="inline-flex items-center gap-2 text-foreground/80 transition hover:text-amber-700 dark:hover:text-amber-600"
              aria-label="Repositório do Meg Pocket no GitHub"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Magos & Grimórios. Alguns direitos reservados.</p>
        <p>Código MIT. Conteúdo homebrew aberto para uso e adaptação não comercial.</p>
      </div>
    </footer>
  );
}
