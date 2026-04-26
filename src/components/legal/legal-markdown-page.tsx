import { readFile } from "node:fs/promises";
import path from "node:path";
import { Footer } from "@/components/footer";
import { MarkdownContent } from "@/components/world/markdown-content";
import { Navbar } from "@/components/navbar";

type LegalMarkdownPageProps = {
  filename: string;
  eyebrow: string;
  title: string;
  description: string;
};

export async function LegalMarkdownPage({
  filename,
  eyebrow,
  title,
  description,
}: LegalMarkdownPageProps) {
  const content = await readFile(path.join(process.cwd(), "docs", filename), "utf8");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="font-display mt-3 text-3xl font-bold md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-10">
          <MarkdownContent content={content} className="max-w-none" />
        </section>
      </main>
      <Footer />
    </>
  );
}
