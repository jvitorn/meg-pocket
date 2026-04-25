"use client";

import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="text-foreground border-t border-border py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        {/* Logo */}
        <div
          className="font-display text-xl md:text-2xl font-bold text-center md:text-left"
        >
          MAGOS &<br />GRIMORIOS
        </div>

        {/* Links + Social */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-yellow-600">
            <Link href="/" className="hover:underline">
              Inicio
            </Link>
            <Link href="/termos" className="hover:underline">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:underline">
              Privacidade
            </Link>
            <Link
              href="https://github.com/jvitorn/meg-pocket"
              target="_blank"
              aria-label="Repositório do Meg Pocket no GitHub"
            >
              <Github className="w-5 h-5 hover:text-yellow-500 transition" />
            </Link>
          </div>

          <p className="text-muted-foreground text-xs mt-3 text-center">
            © {year} Magos & Grimórios, Todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
