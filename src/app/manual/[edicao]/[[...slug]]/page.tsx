import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MDXContent } from "mdx/types";
import type { TOCItemType } from "fumadocs-core/toc";

import { ManualShell } from "@/components/manual/ManualShell";
import {
  getManualSource,
  isEdicaoManual,
  manualCompletoSource,
  manualEssencialSource,
  type EdicaoManual,
} from "@/lib/manual/source";
import { useMDXComponents as getMDXComponents } from "@/mdx-components";

type ManualPageParams = {
  edicao: string;
  slug?: string[];
};

type ManualPageProps = {
  params: Promise<ManualPageParams>;
};

type RenderableManualData = {
  title?: string;
  description?: string;
  body?: MDXContent;
  toc?: TOCItemType[];
  load?: () => Promise<{
    body: MDXContent;
    toc: TOCItemType[];
  }>;
};

function getEditionLabel(edicao: EdicaoManual) {
  return edicao === "essencial" ? "Essencial" : "Completo";
}

async function getRenderableData(data: RenderableManualData) {
  if (typeof data.load === "function") {
    return {
      ...data,
      ...(await data.load()),
    };
  }

  return data;
}

export function generateStaticParams() {
  return [
    ...manualEssencialSource.getPages().map((page) => ({
      edicao: "essencial",
      slug: page.slugs,
    })),
    ...manualCompletoSource.getPages().map((page) => ({
      edicao: "completo",
      slug: page.slugs,
    })),
  ];
}

export async function generateMetadata({
  params,
}: ManualPageProps): Promise<Metadata> {
  const { edicao, slug = [] } = await params;

  if (!isEdicaoManual(edicao)) {
    return {
      title: "Manual nao encontrado | M&G Pocket",
    };
  }

  const source = getManualSource(edicao);
  const page = source.getPage(slug);

  if (!page) {
    return {
      title: "Manual nao encontrado | M&G Pocket",
    };
  }

  return {
    title: `${page.data.title ?? "Manual"} | Manual ${getEditionLabel(edicao)} | M&G Pocket`,
    description: page.data.description,
  };
}

export default async function ManualEditionPage({ params }: ManualPageProps) {
  const { edicao, slug = [] } = await params;

  if (!isEdicaoManual(edicao)) {
    notFound();
  }

  const source = getManualSource(edicao);
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const data = await getRenderableData(page.data);
  const Content = data.body;

  if (!Content) {
    notFound();
  }

  return (
    <ManualShell
      edicao={edicao}
      title={data.title ?? "Manual"}
      description={data.description}
      slugs={page.slugs}
      currentUrl={page.url}
      pageTree={source.getPageTree()}
      toc={data.toc ?? []}
    >
      <Content components={getMDXComponents({})} />
    </ManualShell>
  );
}
