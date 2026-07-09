import type { Root } from "fumadocs-core/page-tree";

import { cn } from "@/lib/utils";
import type { EdicaoManual } from "@/lib/manual/source";
import { ManualEditionSelector } from "./ManualEditionSelector";
import { ManualSidebarTree } from "./ManualSidebarTree";

type ManualSidebarProps = {
  edicao: EdicaoManual;
  tree: Root;
  currentUrl: string;
  className?: string;
};

export function ManualSidebar({
  edicao,
  tree,
  currentUrl,
  className,
}: ManualSidebarProps) {
  return (
    <aside
      aria-label="Navegação lateral do manual"
      className={cn(
        "hidden rounded-[1.35rem] border border-border/70 bg-card/80 p-4 shadow-sm lg:block",
        className
      )}
    >
      <ManualEditionSelector edicao={edicao} />
      <ManualSidebarTree
        tree={tree}
        currentUrl={currentUrl}
        className="mt-4"
      />
    </aside>
  );
}
