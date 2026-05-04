import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BookOpenText,
  Dices,
  HeartPulse,
  Shield,
  ShieldAlert,
  Swords,
  Zap,
} from "lucide-react";

import { AppBreadcrumb } from "@/components/app-breadcrumb";
import {
  formatAmeacaList,
  getElementoAmeacaConfig,
  getTipoAmeacaConfig,
} from "@/components/ameacas/ameaca-theme";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { buscarAmeacaPorSlug, listarAmeacas } from "@/lib/ameacas";
import { cn } from "@/lib/utils";

type PageParams = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const ameacas = await listarAmeacas();
  return ameacas.map((ameaca) => ({ id: ameaca.id }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const ameaca = await buscarAmeacaPorSlug(id);

  if (!ameaca) {
    return {
      title: "Ameaça não encontrada — M&G Pocket",
    };
  }

  return {
    title: `${ameaca.nome} — Ameaças | M&G Pocket`,
    description: ameaca.descricao,
  };
}

export default async function AmeacaDetailPage({ params }: PageParams) {
  const { id } = await params;
  const ameaca = await buscarAmeacaPorSlug(id);

  if (!ameaca) notFound();

  const tipoConfig = getTipoAmeacaConfig(ameaca.tipo);
  const elementoConfig = getElementoAmeacaConfig(ameaca.elemento);
  const TipoIcon = tipoConfig.icon;
  const ElementoIcon = elementoConfig.icon;

  return (
    <>
      <Navbar />
      <main className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_10%,rgba(239,68,68,0.11),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.1),transparent_24%),linear-gradient(180deg,#fff7ed_0%,var(--background)_32%,#fff_100%)] text-foreground dark:bg-background dark:bg-none">
        <section className="relative isolate overflow-hidden">
          <Image
            src="/imgs/backgrounds/ameacas2.jpg"
            alt=""
            fill
            priority
            aria-hidden="true"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/60 to-black/42 dark:from-black dark:via-black/76 dark:to-black/50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(220,38,38,0.25),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.18),transparent_24%),radial-gradient(circle_at_50%_86%,rgba(250,204,21,0.13),transparent_30%)]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
            <AppBreadcrumb
              className="mb-10"
              items={[
                { label: "Início", href: "/" },
                { label: "Ameaças", href: "/ameacas" },
                { label: ameaca.nome },
              ]}
            />

            <div className="grid min-h-95 items-end gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] backdrop-blur", tipoConfig.chipClass)}>
                    <TipoIcon className="h-4 w-4" />
                    {ameaca.tipo}
                  </span>
                  <span className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] backdrop-blur", elementoConfig.chipClass)}>
                    <ElementoIcon className="h-4 w-4" />
                    {ameaca.elemento}
                  </span>
                  {ameaca.tipoSecundario ? (
                    <span className="rounded-md border border-white/15 bg-black/35 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
                      {ameaca.tipoSecundario}
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-5 text-4xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_16px_34px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
                  {ameaca.nome}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white/84 sm:text-lg">
                  {ameaca.descricao}
                </p>
              </div>

              <div className="rounded-lg border border-white/15 bg-black/38 p-4 text-white shadow-2xl backdrop-blur-md">
                <div className={cn("mb-4 flex h-16 w-16 items-center justify-center rounded-md border", tipoConfig.surfaceClass)}>
                  <TipoIcon className={cn("h-8 w-8", tipoConfig.iconClass)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <HeroStat icon={<Zap className="h-4 w-4" />} label="VA" value={ameaca.va} />
                  <HeroStat icon={<HeartPulse className="h-4 w-4" />} label="PV" value={ameaca.pv} />
                  <HeroStat icon={<Dices className="h-4 w-4" />} label="Dano" value={ameaca.danoBase} />
                  <HeroStat icon={<Shield className="h-4 w-4" />} label="Defesa" value={ameaca.defesa} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
          <div className="grid gap-6">
            <InfoPanel
              icon={<BookOpenText className="h-5 w-5" />}
              title="Narrativa"
              body={ameaca.narrativa}
            />

            <article className="rounded-lg border border-red-950/10 bg-white/94 p-5 shadow-sm shadow-red-950/5 dark:border-border/70 dark:bg-card/88 dark:shadow-none">
              <div className="mb-4 flex items-center gap-2">
                <Swords className="h-5 w-5 text-red-600 dark:text-red-300" />
                <h2 className="text-xl font-semibold text-foreground">
                  Golpes sugeridos
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {ameaca.golpes.map((golpe) => (
                  <div
                    key={golpe.nome}
                    className="rounded-lg border border-red-950/10 bg-orange-50/70 p-4 shadow-xs dark:border-border/70 dark:bg-background/70"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{golpe.nome}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {golpe.descricao}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-medium">
                        {golpe.dano ? (
                          <span className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
                            {golpe.dano}
                          </span>
                        ) : null}
                        {golpe.custoMana ? (
                          <span className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
                            {golpe.custoMana} mana
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className="grid gap-6 self-start lg:sticky lg:top-24">
            <article className="rounded-lg border border-red-950/10 bg-white/94 p-5 shadow-sm shadow-red-950/5 dark:border-border/70 dark:bg-card/88 dark:shadow-none">
              <div className="mb-4 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-300" />
                <h2 className="text-xl font-semibold text-foreground">Resumo</h2>
              </div>

              <div className="grid gap-3">
                <SummaryRow label="Função" value={ameaca.funcao} />
                <SummaryRow label="Mana" value={ameaca.mana} />
                <SummaryRow label="Dano médio" value={ameaca.danoMedio} />
                <SummaryRow
                  label="Reações"
                  value={`Bloqueio ${ameaca.reacoes.bloqueio} / Esquiva ${ameaca.reacoes.esquiva} / Contra ${ameaca.reacoes.contraAtaque}`}
                />
                <SummaryRow label="Fraquezas" value={formatAmeacaList(ameaca.fraquezas)} />
                <SummaryRow label="Resistências" value={formatAmeacaList(ameaca.resistencias)} />
                <SummaryRow label="Imunidades" value={formatAmeacaList(ameaca.imunidades)} />
              </div>
            </article>

            <Button asChild variant="outline" className="justify-center">
              <Link href="/ameacas">
                <ArrowLeft className="h-4 w-4" />
                Voltar para ameaças
              </Link>
            </Button>
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-white/15 bg-white/8 p-3">
      <div className="flex items-center gap-2 text-white/68">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-red-950/10 bg-white/94 p-5 shadow-sm shadow-red-950/5 dark:border-border/70 dark:bg-card/88 dark:shadow-none">
      <div className="mb-3 flex items-center gap-2 text-red-600 dark:text-red-300">
        {icon}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <p className="text-sm leading-7 text-muted-foreground">{body}</p>
    </article>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
