import type { ReactNode } from "react";

import type { EdicaoManual } from "@/lib/manual/source";
import { ManualBreadcrumb } from "./ManualBreadcrumb";
import { ManualTagList } from "./ManualTagList";
import { ManualIlustracao } from "./mdx";

type ManualMainProps = {
  edicao: EdicaoManual;
  title: string;
  description?: string;
  slugs: string[];
  children: ReactNode;
};

export function ManualMain({
  edicao,
  title,
  description,
  slugs,
  children,
}: ManualMainProps) {
  return (
    <article className="min-w-0 rounded-[1.35rem] border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6 lg:p-8">
      <ManualBreadcrumb edicao={edicao} pageTitle={title} slugs={slugs} />
      <div className="mt-3">
        <ManualTagList edicao={edicao} />
      </div>

      <h1 className="mt-3 font-display text-[2rem] font-bold leading-[1.08] tracking-normal text-foreground sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}

      <ManualIlustracao
        placeholder
        titulo="ILUSTRAÇÃO DE ABERTURA"
        legenda="concept art · largura total"
      />

      <div className="manual-mdx-content mt-5 text-foreground/85 [&>h1:first-child]:hidden [&_a]:font-medium [&_a]:text-amber-700 [&_a]:underline-offset-4 hover:[&_a]:underline dark:[&_a]:text-amber-600 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.92em] [&_h1]:mb-4 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-normal [&_h1]:text-foreground [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:scroll-m-24 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-normal [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:scroll-m-24 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:pl-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:my-4 [&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-foreground/80 sm:[&_p]:text-base [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
