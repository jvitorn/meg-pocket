"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast, Toaster } from "sonner";

import LogoGuerreiro from "@/components/icons/guerreiro";
import LogoElementalista from "@/components/icons/elementalista";
import LogoPurificador from "@/components/icons/purificador";
import LogoArtifice from "@/components/icons/artifice";

import { LoadingSpinner } from "@/components/loadingSpinner";
import { HelpCircle, Sparkles } from "lucide-react";
import { ClasseInterface,MagiaPersonagem } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


export default function ClassePage() {
  const { id } = useParams<{ id: string }>();
  const [classe, setClasse] = useState<ClasseInterface | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog de magia
  const [selectedMagia, setSelectedMagia] = useState<MagiaPersonagem | null>(null);
  const [magiaDialogOpen, setMagiaDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/classes/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          const msg = json?.error ?? `Erro ao buscar classe (status ${res.status})`;
          throw new Error(msg);
        }
        if (mounted) setClasse(json.data as ClasseInterface);
      } catch (err) {
        console.error("Erro fetch classe:", err);
        if (mounted) setError((err as Error).message ?? "Erro desconhecido");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const IconByKey = useCallback((key?: string | null, className = "w-20 h-20 mx-auto") => {
    const k = (key ?? "").toLowerCase();
    if (k.includes("guerrei")) return <LogoGuerreiro className={`${className} text-red-600`} />;
    if (k.includes("element") || k.includes("elementalista")) return <LogoElementalista className={`${className} text-blue-600`} />;
    if (k.includes("purific") || k.includes("purificador")) return <LogoPurificador className={`${className} text-emerald-600`} />;
    if (k.includes("artifice") || k.includes("artífice")) return <LogoArtifice className={`${className} text-amber-600`} />;
    return <HelpCircle className={`${className} text-gray-400`} />;
  }, []);

  const tags = useMemo(() => (Array.isArray(classe?.tags) ? classe!.tags! : []), [classe]);

  const magias = useMemo(() => (Array.isArray(classe?.Magias) ? classe!.Magias! : []), [classe]);

  const abrirMagia = useCallback((m: MagiaPersonagem) => {
    setSelectedMagia(m);
    setMagiaDialogOpen(true);
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <>
        <Toaster position="top-right" />
        <main className="w-full bg-background text-foreground p-6">
          <div className="max-w-4xl mx-auto text-center text-red-500">Erro: {error}</div>
        </main>
      </>
    );
  }

  if (!classe) {
    return (
      <>
        <Toaster position="top-right" />
        <main className="w-full bg-background text-foreground p-6">
          <div className="max-w-4xl mx-auto text-center text-muted-foreground">Classe não encontrada.</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <main className="w-full bg-background text-foreground">
        {/* HERO */}
        <section className="relative w-full h-[60vh] md:h-[72vh] flex items-end justify-center">
          <Image
            src={classe.background ?? `/imgs/backgrounds/classe_guerreiro.jpg`}
            alt="Background classe"
            fill
            priority
            unoptimized
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/40 to-transparent" />

          <div className="relative z-20 pb-24 text-center text-gray-100 drop-shadow-xl">
            {IconByKey(classe.slug ?? classe.nome)}
            <h1 className="mt-4 text-5xl md:text-7xl font-extrabold tracking-wide uppercase">
              {classe.nome}
            </h1>
            <p className="mt-2 text-lg md:text-xl opacity-90">{classe.subtitulo}</p>
          </div>
        </section>

        {/* SEÇÃO PRINCIPAL */}
        <section className="relative -mt-20 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            {/* Full-body — coluna direita */}
            <div className="md:col-span-5 relative flex flex-col items-center order-1 md:order-2">
              {classe.img_corpo ? (
                <img
                  src={classe.img_corpo}
                  alt={`${classe.nome} full body`}
                  className="max-h-[520px] object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.6)]"
                />
              ) : (
                <div className="w-full h-[420px] bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground">Sem imagem</span>
                </div>
              )}
              <span className="mt-3 text-xs text-muted-foreground">
                Arte de referência — {classe.exemploPersonagem ?? "—"}.
              </span>
            </div>

            {/* COLUNA TEXTO — esquerda: Card cortado até TAGS no desktop */}
            <div className="md:col-span-7 order-2 md:order-1">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight text-white">{classe.nome}</h2>

              <div className="bg-white/90 dark:bg-transparent backdrop-blur-sm md:shadow-lg md:rounded-lg md:p-7 md:border md:border-gray-300 dark:border-primary">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Sobre</h3>
                <p className="leading-relaxed text-[15px] text-foreground/90">{classe.sobre ?? "Sem descrição disponível."}</p>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Gameplay</h3>
                  <p className="leading-relaxed text-[15px] text-foreground/90">{classe.gameplay ?? "Sem gameplay disponível."}</p>
                </div>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700 text-center">
                    <div className="text-xs text-muted-foreground uppercase">HP Base</div>
                    <div className="text-2xl font-bold mt-1">{classe.hp ?? "—"}</div>
                  </div>

                  <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700 text-center">
                    <div className="text-xs text-muted-foreground uppercase">Mana Base</div>
                    <div className="text-2xl font-bold mt-1">{classe.mana ?? "—"}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.length > 0 ? tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 text-xs rounded-full bg-gray-200 dark:bg-slate-800 border border-gray-300 dark:border-gray-700 text-foreground/90">{tag}</span>
                    )) : <span className="text-xs text-muted-foreground">Sem tags</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 order-2 md:order-1 mt-8">
              <div className="bg-white/80 dark:bg-slate-900/70 rounded-lg p-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Exemplo de personagem</h4>
                <div className="bg-gray-100 dark:bg-slate-800 rounded-md px-4 py-3">
                  <span className="text-foreground font-semibold">{classe.exemploPersonagem ?? "—"}</span>
                </div>
              </div>

              <div className="mt-6 bg-white/80 dark:bg-slate-900/70 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold uppercase text-muted-foreground">Combate e Magias</h4>
                  <p className="text-xs text-muted-foreground">Toque em uma magia para ver mais</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {magias.length > 0 ? (
                    magias.map((m) => (
                      <button
                        type="button"
                        aria-label={`Abrir magia ${m.nome}`}
                        key={m.id}
                        onClick={() => abrirMagia(m)}
                        className="p-4 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-sm text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm">{m.nome}</div>
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{m.descricao ?? "Sem descrição."}</p>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-1 md:col-span-3 text-sm text-muted-foreground">Nenhuma magia cadastrada para esta classe.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="h-24" />
      </main>

      {/* Dialog de magia: exibe dados completos da magia selecionada */}
      <Dialog open={magiaDialogOpen} onOpenChange={(v) => { setMagiaDialogOpen(v); if (!v) setSelectedMagia(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMagia?.nome ?? "Magia"}</DialogTitle>
            <DialogDescription>
              Detalhes da magia — alcance e custo.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 space-y-3">
            <div>
              <h5 className="text-xs text-muted-foreground uppercase mb-1">Descrição</h5>
              <p className="text-sm leading-relaxed whitespace-pre-line">{selectedMagia?.descricao ?? "Sem descrição disponível."}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <h6 className="text-xs text-muted-foreground uppercase mb-1">Alcance</h6>
                <div className="text-sm">{selectedMagia?.alcance ?? "—"}</div>
              </div>
              <div>
                <h6 className="text-xs text-muted-foreground uppercase mb-1">Custo (mana)</h6>
                <div className="text-sm">{typeof selectedMagia?.custo_nivel === "number" ? selectedMagia.custo_nivel : "—"}</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-2 w-full justify-end">
              <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
              </DialogClose>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
