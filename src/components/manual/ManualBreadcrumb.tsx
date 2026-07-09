import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { EdicaoManual } from "@/lib/manual/source";

type ManualBreadcrumbProps = {
  edicao: EdicaoManual;
  pageTitle: string;
  slugs: string[];
};

function getEditionLabel(edicao: EdicaoManual) {
  return edicao === "essencial" ? "Essencial" : "Completo";
}

function formatSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ManualBreadcrumb({
  edicao,
  pageTitle,
  slugs,
}: ManualBreadcrumbProps) {
  const items = [
    { label: "Manual", href: "/manual" },
    { label: getEditionLabel(edicao), href: `/manual/${edicao}` },
    ...slugs.slice(0, -1).map((slug, index) => ({
      label: formatSlug(slug),
      href: `/manual/${edicao}/${slugs.slice(0, index + 1).join("/")}`,
    })),
  ];
  const showCurrent = slugs.length > 0;

  return (
    <nav
      aria-label="Caminho do manual"
      className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground"
    >
      {items.map((item, index) => (
        <span key={item.href} className="inline-flex items-center gap-1.5">
          <Link
            href={item.href}
            className="transition hover:text-amber-700 dark:hover:text-amber-600"
          >
            {item.label}
          </Link>
          {index < items.length - 1 || showCurrent ? (
            <ChevronRight className="size-3 text-muted-foreground/60" />
          ) : null}
        </span>
      ))}
      {showCurrent ? (
        <span className="text-amber-700 dark:text-amber-600">{pageTitle}</span>
      ) : null}
    </nav>
  );
}
