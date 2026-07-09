import type { Root } from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";
import { ChevronDown, ListTree, Search } from "lucide-react";

import type { EdicaoManual } from "@/lib/manual/source";
import { ManualEditionSelector } from "./ManualEditionSelector";
import { ManualSidebarTree } from "./ManualSidebarTree";

type ManualMobileBarProps = {
  edicao: EdicaoManual;
  tree: Root;
  currentUrl: string;
  toc: TOCItemType[];
};

export function ManualMobileBar({
  edicao,
  tree,
  currentUrl,
  toc,
}: ManualMobileBarProps) {
  return (
    <div className="mb-4 lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        <details className="group">
          <summary className="inline-flex h-10 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/80 px-3 text-sm font-semibold text-foreground transition marker:hidden hover:border-amber-600/30 hover:bg-amber-600/5">
            <ListTree className="size-4 text-amber-600 dark:text-amber-700" />
            Capítulos
          </summary>
          <div
            aria-label="Navegação do manual"
            role="dialog"
            className="fixed inset-x-3 bottom-4 top-24 z-50 overflow-y-auto rounded-2xl border border-border/80 bg-background p-4 text-foreground shadow-2xl"
          >
            <label className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 text-sm text-muted-foreground">
              <Search className="size-4" />
              <span className="sr-only">Buscar no manual</span>
              <input
                type="search"
                placeholder="Buscar no manual..."
                className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>

            <ManualEditionSelector edicao={edicao} />
            <ManualSidebarTree
              tree={tree}
              currentUrl={currentUrl}
              className="mt-4"
            />
          </div>
        </details>

        <details className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/80 px-3 text-sm font-semibold text-foreground transition marker:hidden hover:border-amber-600/30 hover:bg-amber-600/5">
            Nesta página
            <ChevronDown className="size-4 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 max-h-72 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border/70 bg-popover p-2 text-popover-foreground shadow-2xl">
            {toc.length > 0 ? (
              toc.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-amber-700 dark:hover:text-amber-600"
                >
                  {item.title}
                </a>
              ))
            ) : (
              <span className="block px-3 py-2 text-sm text-muted-foreground">
                Sem tópicos nesta página
              </span>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
