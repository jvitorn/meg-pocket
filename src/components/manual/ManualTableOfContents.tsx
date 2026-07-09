import type { TOCItemType } from "fumadocs-core/toc";

import { cn } from "@/lib/utils";

type ManualTableOfContentsProps = {
  toc: TOCItemType[];
  className?: string;
};

function getDepthClass(depth: number) {
  if (depth <= 2) return "pl-0";
  if (depth === 3) return "pl-3";
  return "pl-6";
}

export function ManualTableOfContents({
  toc,
  className,
}: ManualTableOfContentsProps) {
  return (
    <aside
      className={cn(
        "hidden rounded-[1.35rem] border border-border/70 bg-card/80 p-4 shadow-sm lg:sticky lg:top-6 lg:block",
        className
      )}
    >
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Nesta página
      </div>
      <nav aria-label="Sumario da pagina">
        <ul className="space-y-1">
          {toc.length > 0 ? (
            toc.map((item, index) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  className={cn(
                    "block border-l-2 py-1.5 pr-1 text-[13px] leading-tight transition hover:text-amber-700 dark:hover:text-amber-600",
                    index === 0
                      ? "border-amber-600 text-foreground"
                      : "border-border text-muted-foreground",
                    getDepthClass(item.depth)
                  )}
                >
                  {item.title}
                </a>
              </li>
            ))
          ) : (
            <li className="border-l-2 border-border py-1.5 pl-3 text-[13px] text-muted-foreground">
              Sem tópicos
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
