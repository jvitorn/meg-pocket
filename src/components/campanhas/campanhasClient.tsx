// src/components/campanhas/CampanhasClient.tsx
'use client';

import { useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CampanhaInterface, PersonagemInterface } from '@/types';
import { getPersonagensNaCampanha } from '@/services/personagemService';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

type Props = {
  initialCampanhas: CampanhaInterface[];
};

const PERSONAGENS_CACHE_TTL_MS = 30_000;

export default function CampanhasClient({ initialCampanhas }: Props) {
  const [campanhas] = useState<CampanhaInterface[]>(initialCampanhas || []);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<CampanhaInterface | null>(null);
  const [personagens, setPersonagens] = useState<PersonagemInterface[]>([]);
  const [loadingPersonagens, setLoadingPersonagens] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const personagensCache = useRef<
    Record<number, { data: PersonagemInterface[]; fetchedAt: number }>
  >({});

  async function abrirDetalhes(campanha: CampanhaInterface) {
    setCampanhaSelecionada(campanha);
    setDialogAberto(true);

    const cachedEntry = personagensCache.current[campanha.id];

    if (
      cachedEntry &&
      Date.now() - cachedEntry.fetchedAt < PERSONAGENS_CACHE_TTL_MS
    ) {
      setPersonagens(cachedEntry.data);
      setLoadingPersonagens(false);
      return;
    }

    setLoadingPersonagens(true);
    setPersonagens([]);

    try {
      const dataPersonagens: PersonagemInterface[] =
        await getPersonagensNaCampanha(campanha.id);

      personagensCache.current[campanha.id] = {
        data: dataPersonagens || [],
        fetchedAt: Date.now(),
      };

      setPersonagens(dataPersonagens || []);
    } catch (err) {
      console.error("Erro ao carregar personagens:", err);
      setPersonagens([]);
    } finally {
      setLoadingPersonagens(false);
    }
  }

  const campanhasFiltradas = useMemo(() => {
    const query = busca.trim().toLowerCase();

    if (!query) return campanhas;

    return campanhas.filter((campanha) =>
      [
        campanha.nome,
        campanha.mestre,
        campanha.sinopse,
        ...(campanha.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [busca, campanhas]);

  return (
    <>
      <div className="grid gap-3 rounded-lg border bg-card/60 p-3 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar campanha, mestre, tag..."
            className="pl-9"
          />
        </label>
        <div className="flex h-9 items-center rounded-md border bg-background px-3 text-sm text-muted-foreground">
          {campanhasFiltradas.length} campanha{campanhasFiltradas.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lista de campanhas animada */}
      {campanhasFiltradas.length > 0 ? (
        <motion.section
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: 30 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { staggerChildren: 0.08, duration: 0.4 },
          },
        }}
      >
        {campanhasFiltradas.map((campanha) => (
          <motion.div
            key={campanha.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={() => abrirDetalhes(campanha)}
            className="hover-shimmer-card group relative cursor-pointer overflow-hidden rounded-xl border border-border/30 bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/35 hover:shadow-2xl dark:bg-slate-900/60 [--shimmer-color:#f59e0b]"
          >
            {/* Imagem de capa */}
            <div className="relative w-full h-44 sm:h-52 overflow-hidden">
              {campanha.capa ? (
                <motion.img
                  src={campanha.capa}
                  alt={`Capa ${campanha.nome}`}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.06 }}
                  transition={{ duration: 0.6 }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-amber-500/20 via-emerald-500/10 to-sky-500/15 text-sm text-muted-foreground">
                  Sem capa
                </div>
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/35 to-transparent" />
              <div className="absolute left-4 right-4 bottom-4 rounded-md bg-black/40 backdrop-blur-sm px-4 py-3 border border-white/5">
                <h2 id={`camp-${campanha.id}-title`} className="text-lg font-semibold text-white truncate">
                  {campanha.nome}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/75">
                  <span>{campanha.count_jogadores} personagem{campanha.count_jogadores !== 1 ? 's' : ''}</span>
                  {campanha.mestre ? <span>Mestre: {campanha.mestre}</span> : null}
                </div>
              </div>
            </div>

            {/* Conteúdo inferior */}
            <div className="p-4 flex flex-col justify-between h-[170px] bg-linear-to-b from-transparent to-black/5">
              {campanha.sinopse ? (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                  {campanha.sinopse}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Sem sinopse disponível.</p>
              )}

              {campanha.tags && campanha.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {campanha.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full dark:bg-white/5 dark:text-white/80 border dark:border-white/6 border-b-black/6 capitalize">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Botões */}
              <div className="flex items-center gap-3 mt-auto" onClick={(e) => e.stopPropagation()}>
                <Link href={`/personagens/campanha/${campanha.id}`} className="flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold bg-purple-600 text-white shadow-md hover:opacity-95 transition">
                  Ver Personagens
                </Link>

                <button onClick={() => abrirDetalhes(campanha)} className="flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium border dark:border-white/10 border-b-black/10 hover:bg-white/5 transition">
                  Detalhes
                </button>
              </div>
            </div>

            {/* brilho suave no hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-linear-to-t from-amber-500/8 via-transparent to-transparent" />
          </motion.div>
        ))}
        </motion.section>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed bg-card/40 px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">Nenhuma campanha encontrada</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente buscar por outro nome, mestre ou tag.
          </p>
        </div>
      )}

      {/* Modal com animação suave */}
      <AnimatePresence>
        {dialogAberto && campanhaSelecionada && (
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden border border-border/70 bg-background/95 p-0 backdrop-blur-md sm:rounded-xl lg:max-w-6xl">
              <DialogTitle className="sr-only">{campanhaSelecionada.nome}</DialogTitle>

              <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 10 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="flex max-h-[90vh] w-full flex-col"
              >
                {/* Capa */}
                <div className="relative w-full shrink-0 h-60 md:h-72 overflow-hidden">
                  {campanhaSelecionada.capa ? (
                    <img src={campanhaSelecionada.capa} alt={`Capa ${campanhaSelecionada.nome}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-amber-500/20 via-emerald-500/10 to-sky-500/15 text-sm text-muted-foreground">Sem capa</div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-6 text-white drop-shadow-lg">
                    <motion.h2 layoutId={`title-${campanhaSelecionada.id}`} className="text-2xl md:text-3xl font-bold">
                      {campanhaSelecionada.nome}
                    </motion.h2>
                    <p className="text-sm opacity-90">Mestre: {campanhaSelecionada.mestre || 'Desconhecido'}</p>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="overflow-y-auto p-6">
                  {campanhaSelecionada.sinopse && <p className="text-sm leading-relaxed text-foreground/90">{campanhaSelecionada.sinopse}</p>}

                  {campanhaSelecionada.tags?.length ? (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {campanhaSelecionada.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-1 rounded-full bg-muted/20 capitalize border border-border/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Personagens */}
                  <section className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <User2 className="h-5 w-5 text-primary" /> Personagens
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {loadingPersonagens ? 'Carregando...' : `${personagens.length} personagem${personagens.length !== 1 ? 's' : ''}`}
                      </span>
                    </div>

                    {loadingPersonagens ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 rounded-md border p-3 bg-background/70"
                          >
                            <Skeleton className="h-12 w-12 rounded-md" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-28" />
                              <Skeleton className="h-3 w-36" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : personagens.length > 0 ? (
                      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}>
                        {personagens.map((p) => (
                          <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                            <Link href={`/personagens/${p.id}`} onClick={() => setDialogAberto(false)} className="group flex items-center gap-3 rounded-md border bg-background/70 p-3 transition hover:border-amber-500/30 hover:bg-amber-500/5">
                            {(() => {
                              const imageSrc = p.imagem_pixel || p.url_imagem;

                              return imageSrc ? (
                                <img src={imageSrc} alt={p.nome} className="w-12 h-12 rounded-md object-cover" />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                                  <User2 className="h-5 w-5 text-muted-foreground" />
                                </div>
                              );
                            })()}
                            <div>
                              <p className="font-medium capitalize">{p.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.classe_nome && p.raca_nome ? `${p.classe_nome} ${p.raca_nome}` : p.classe_nome || p.raca_nome || 'Personagem'}
                              </p>
                              <p className="mt-1 text-xs capitalize text-primary transition group-hover:text-amber-600">{p.elemento}</p>
                            </div>
                            </Link>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum personagem encontrado.</p>
                    )}
                  </section>
                  <div className="h-24" />
                </div>

                {/* Footer sticky */}
                <div className="sticky bottom-0 flex flex-col items-center justify-between gap-3 border-t bg-background/95 p-4 sm:flex-row">
                  <div className="text-sm text-muted-foreground">{campanhaSelecionada.count_jogadores ?? 0} personagens registrados</div>
                  <div className="flex items-center gap-3">
                    <Link href={`/personagens/campanha/${campanhaSelecionada.id}`} onClick={() => setDialogAberto(false)} className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-purple-600 text-white shadow hover:opacity-95 transition">
                      Ver todos os personagens
                    </Link>
                    <button onClick={() => setDialogAberto(false)} className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium border hover:bg-white/5 transition">
                      Fechar
                    </button>
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
