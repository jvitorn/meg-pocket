import type { Folder, Node, Root } from "fumadocs-core/page-tree";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ManualSidebarTreeProps = {
  tree: Root;
  currentUrl: string;
  className?: string;
};

function isActiveNode(node: Node, currentUrl: string): boolean {
  if (node.type === "page") return node.url === currentUrl;
  if (node.type === "folder") {
    return (
      node.index?.url === currentUrl ||
      node.children.some((child) => isActiveNode(child, currentUrl))
    );
  }
  return false;
}

function renderSection(title: ReactNode) {
  return (
    <div className="px-2 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground first:pt-0">
      {title}
    </div>
  );
}

function renderFolder(folder: Folder, currentUrl: string) {
  return (
    <li key={folder.$id ?? folder.$ref?.folder ?? String(folder.name)}>
      {renderSection(folder.name)}
      <ul className="space-y-0.5">
        {folder.index ? renderPage(folder.index, currentUrl, 0) : null}
        {folder.children.map((child, index) => renderNode(child, currentUrl, index + 1))}
      </ul>
    </li>
  );
}

function renderPage(
  page: Extract<Node, { type: "page" }>,
  currentUrl: string,
  index: number
) {
  const isActive = page.url === currentUrl;

  return (
    <li key={page.$id ?? page.url}>
      <Link
        href={page.url}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-9 items-center gap-2.5 rounded-md border px-3 py-2 text-[14.5px] leading-tight transition",
          isActive
            ? "border-amber-600/25 bg-amber-600/10 font-semibold text-amber-700 dark:text-amber-600"
            : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <span className="w-4 shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-700">
          {index > 0 ? index : ""}
        </span>
        <span className="min-w-0 flex-1">{page.name}</span>
      </Link>
    </li>
  );
}

function renderNode(node: Node, currentUrl: string, index: number) {
  if (node.type === "separator") {
    return (
      <li key={node.$id ?? String(node.name)}>
        {renderSection(node.name)}
      </li>
    );
  }

  if (node.type === "folder") {
    return renderFolder(node, currentUrl);
  }

  return renderPage(node, currentUrl, index);
}

export function ManualSidebarTree({
  tree,
  currentUrl,
  className,
}: ManualSidebarTreeProps) {
  return (
    <nav aria-label="Capítulos do manual" className={className}>
      <ul className="space-y-1">
        {tree.children.map((node, index) => renderNode(node, currentUrl, index))}
      </ul>
    </nav>
  );
}

export function hasActiveManualNode(tree: Root, currentUrl: string) {
  return tree.children.some((node) => isActiveNode(node, currentUrl));
}
