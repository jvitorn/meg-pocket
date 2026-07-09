import type { Root } from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";
import type { ReactNode } from "react";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import type { EdicaoManual } from "@/lib/manual/source";
import { ManualMain } from "./ManualMain";
import { ManualMobileBar } from "./ManualMobileBar";
import { ManualSidebar } from "./ManualSidebar";
import { ManualTableOfContents } from "./ManualTableOfContents";

type ManualShellProps = {
  edicao: EdicaoManual;
  title: string;
  description?: string;
  slugs: string[];
  currentUrl: string;
  pageTree: Root;
  toc: TOCItemType[];
  children: ReactNode;
};

export function ManualShell({
  edicao,
  title,
  description,
  slugs,
  currentUrl,
  pageTree,
  toc,
  children,
}: ManualShellProps) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 text-foreground sm:px-6 lg:py-8">
        <header className="mb-6 rounded-[1.6rem] border border-border/70 bg-card/80 p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Biblioteca de regras
              </p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-foreground md:text-4xl">
                Manual
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted-foreground md:text-base">
                Consulte capítulos, regras e exemplos do sistema Magos &
                Grimórios sem sair do M&G Pocket.
              </p>
            </div>
          </div>
        </header>

        <ManualMobileBar
          edicao={edicao}
          tree={pageTree}
          currentUrl={currentUrl}
          toc={toc}
        />

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_220px] lg:items-start">
          <ManualSidebar
            edicao={edicao}
            tree={pageTree}
            currentUrl={currentUrl}
          />
          <ManualMain
            edicao={edicao}
            title={title}
            description={description}
            slugs={slugs}
          >
            {children}
          </ManualMain>
          <ManualTableOfContents toc={toc} />
        </div>
      </main>
      <Footer />
    </>
  );
}
