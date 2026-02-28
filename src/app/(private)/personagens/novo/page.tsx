import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import PersonagemCreateForm from "@/components/personagens/personagem-create-form";
import { unstable_noStore as noStore } from "next/cache";
import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
});

export default async function NovoPersonagemPage() {
  noStore();

  const [campanhas, classes, racas, pericias] = await prisma.$transaction([
    prisma.campanha.findMany({
      select: {
        id: true,
        nome: true,
        sinopse: true,
        mestre: true,
        count_jogadores: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.classe.findMany({
      select: {
        id: true,
        slug: true,
        tags: true,
        nome: true,
        subtitulo: true,
        descricao: true,
        hp: true,
        mana: true,
        Magias: {
          select: {
            id: true,
            nome: true,
            descricao: true,
            alcance: true,
            custo_nivel: true,
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.raca.findMany({
      select: {
        id: true,
        nome: true,
        descricao: true,
        hp: true,
        mana: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.periciaCatalog.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        descricao: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background text-foreground">
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-500" />

        <section className="bg-gradient-to-b from-muted/40 via-background to-background">
          <div className="w-full px-4 py-10 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Nova ficha
              </p>
              <h1
                className={`${cormorant.className} text-3xl md:text-4xl font-bold`}
              >
                Criar personagem
              </h1>
            </div>
            <div className="mt-6">
              <PersonagemCreateForm
                campanhas={campanhas}
                classes={classes}
                racas={racas}
                pericias={pericias}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
