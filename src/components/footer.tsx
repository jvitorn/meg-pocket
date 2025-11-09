"use client";

import Link from "next/link";
import { Twitter, Github } from "lucide-react";
import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["700"] });

export function Footer() {
    return (
        <footer className="text-foreground border-t border-border py-10 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                {/* Coluna esquerda: Logo */}
                <div className={`${cormorant.className} text-xl md:text-2xl font-bold`}>
                    MAGOS &<br />GRIMORIOS
                </div>

                {/* Coluna central: Links + ícones (em linha no desktop) */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-wrap justify-center md:justify-center gap-6 text-sm font-medium text-yellow-600">
                        <Link href="/" className="hover:underline">Projeto</Link>
                        <Link href="/" className="hover:underline">Documentação</Link>
                        <Link href="/" className="hover:underline">Contato</Link>
                        <Link href="https://github.com" target="_blank" aria-label="GitHub">
                            <Github className="w-5 h-5 hover:text-yellow-500 transition" />
                        </Link>
                    </div>

                    {/* Copyright centralizado abaixo no desktop também */}
                    <p className="text-muted-foreground text-xs mt-3 text-center">
                        © {new Date().getFullYear()} Magos & Grimórios, Todos os direitos reservados
                    </p>
                </div>
            </div>
        </footer>
    );
}