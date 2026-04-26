import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import PersonagemCreateForm, {
  type PersonagemFormInitialData,
} from "@/components/personagens/personagem-create-form";
import { unstable_noStore as noStore } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveColorThemeName } from "@/lib/utils";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

type NovaFichaPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function NovaFichaPage({
  searchParams,
}: NovaFichaPageProps) {
  noStore();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const editId = Number(resolvedSearchParams?.id);
  const shouldEdit = Number.isInteger(editId) && editId > 0;

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
        icone: true,
        corTema: true,
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
        img: true,
        icone: true,
        corTema: true,
        habilidadeDiariaNome: true,
        habilidadeDiariaCombate: true,
        habilidadeDiariaForaDeCombate: true,
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

  const normalizedClasses = classes.map((classe) => ({
    ...classe,
    descricao: classe.descricao ?? undefined,
    icone: classe.icone ?? undefined,
    corTema: resolveColorThemeName(classe.corTema),
    subtitulo: classe.subtitulo ?? undefined,
    hp: classe.hp ?? 0,
    mana: classe.mana ?? 0,
  }));

  const normalizedRacas = racas.map((raca) => ({
    ...raca,
    descricao: raca.descricao ?? undefined,
    img: raca.img ?? undefined,
    icone: raca.icone ?? undefined,
    corTema: resolveColorThemeName(raca.corTema),
    habilidadeDiariaNome: raca.habilidadeDiariaNome ?? undefined,
    habilidadeDiariaCombate: raca.habilidadeDiariaCombate ?? undefined,
    habilidadeDiariaForaDeCombate: raca.habilidadeDiariaForaDeCombate ?? undefined,
    hp: raca.hp ?? 0,
    mana: raca.mana ?? 0,
  }));

  let initialData: PersonagemFormInitialData | null = null;

  if (shouldEdit) {
    if (!userId) {
      redirect("/login");
    }

    const personagem = await prisma.personagem.findFirst({
      where: {
        id: editId,
        userId,
      },
      select: {
        id: true,
        nome: true,
        apelido: true,
        descricao: true,
        url_imagem: true,
        campanhaId: true,
        classeId: true,
        racaId: true,
        elemento: true,
        magiaPersonagem: {
          select: { magiaId: true },
          orderBy: { id: "asc" },
        },
        periciaPersonagem: {
          select: { periciaId: true },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!personagem) {
      redirect("/fichas");
    }

    initialData = {
      id: personagem.id,
      nome: personagem.nome,
      apelido: personagem.apelido ?? "",
      descricao: personagem.descricao ?? "",
      url_imagem: personagem.url_imagem ?? "",
      campanhaId: personagem.campanhaId,
      classeId: personagem.classeId,
      racaId: personagem.racaId,
      elemento: personagem.elemento,
      magiaIds: personagem.magiaPersonagem.map((magia) => magia.magiaId),
      periciaIds: personagem.periciaPersonagem.map((pericia) => pericia.periciaId),
    };
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background text-foreground">
        <div className="h-1 w-full bg-linear-to-r from-amber-400 via-emerald-400 to-sky-500" />

        <section className="bg-linear-to-b from-muted/40 via-background to-background">
          <div className="w-full px-4 py-10 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
            <AppBreadcrumb
              items={[
                { label: "Início", href: "/" },
                { label: "Fichas", href: "/fichas" },
                { label: initialData ? "Editar ficha" : "Nova ficha" },
              ]}
            />
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {initialData ? "Editar ficha" : "Nova ficha"}
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                {initialData ? "Editar ficha" : "Criar ficha"}
              </h1>
            </div>
            <div className="mt-6">
              <PersonagemCreateForm
                campanhas={campanhas}
                classes={normalizedClasses}
                racas={normalizedRacas}
                pericias={pericias}
                initialData={initialData}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
