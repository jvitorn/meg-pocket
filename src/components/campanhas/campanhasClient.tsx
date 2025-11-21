// src/components/campanhas/CampanhasClient.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { User2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/loadingSpinner';
import { CampanhaInterface, PersonagemInterface } from '@/types';
import { getPersonagensNaCampanha } from '@/services/personagemService';

type Props = {
  initialCampanhas: CampanhaInterface[];
};

export default function CampanhasClient({ initialCampanhas }: Props) {
  const [campanhas, setCampanhas] = useState<CampanhaInterface[]>(initialCampanhas || []);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<CampanhaInterface | null>(null);
  const [personagens, setPersonagens] = useState<PersonagemInterface[]>([]);
  const [loadingCampanhas, setLoadingCampanhas] = useState(false); // já veio do server
  const [loadingPersonagens, setLoadingPersonagens] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personagensCache = useRef<Record<number, PersonagemInterface[]>>({});
  // Caso queira revalidar client-side (opcional), você pode implementar refetch.
  // Por ora, confiamos no cache server + revalidateTag depois do update.

  // Abre detalhes e carrega personagens (fetch dinâmico)
  async function abrirDetalhes(campanha: CampanhaInterface) {
  setCampanhaSelecionada(campanha);
  setDialogAberto(true);

  // SE JÁ TEM NO CACHE → usa diretamente
  if (personagensCache.current[campanha.id]) {
    setPersonagens(personagensCache.current[campanha.id]);
    setLoadingPersonagens(false);
    return;
  }

  // CASO CONTRÁRIO → faz fetch e salva no cache
  setLoadingPersonagens(true);
  setPersonagens([]);

  try {
    const dataPersonagens: PersonagemInterface[] =
      await getPersonagensNaCampanha(campanha.id);

    personagensCache.current[campanha.id] = dataPersonagens || []; // salva no cache

    setPersonagens(dataPersonagens || []);
  } catch (err) {
    console.error("Erro ao carregar personagens:", err);
    setPersonagens([]);
  } finally {
    setLoadingPersonagens(false);
  }
}

  if (loadingCampanhas && campanhas.length === 0) return <LoadingSpinner />;
  if (error) return <div className="text-center mt-10 text-red-500">Erro: {error}</div>;

  return (
    <>
      {/* Lista de campanhas animada */}
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
        {campanhas.map((campanha) => (
          <motion.div
            key={campanha.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={() => abrirDetalhes(campanha)}
            className="group relative rounded-xl overflow-hidden border border-border/30 bg-slate-900/60 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl cursor-pointer"
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
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                  Sem capa
                </div>
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/35 to-transparent" />
              <div className="absolute left-4 right-4 bottom-4 rounded-md bg-black/40 backdrop-blur-sm px-4 py-3 border border-white/5">
                <h2 id={`camp-${campanha.id}-title`} className="text-lg font-semibold text-white truncate">
                  {campanha.nome}
                </h2>
                <p className="text-xs text-white/70 mt-1">
                  {campanha.count_jogadores} jogador{campanha.count_jogadores !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>

            {/* Conteúdo inferior */}
            <div className="p-4 flex flex-col justify-between h-[170px] bg-linear-to-b from-transparent to-black/5">
              {campanha.sinopse ? (
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                  {campanha.sinopse}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Sem sinopse disponível.</p>
              )}

              {campanha.tags && campanha.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {campanha.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/80 border border-white/6 capitalize">
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

                <button onClick={() => abrirDetalhes(campanha)} className="flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium border border-white/10 hover:bg-white/5 transition">
                  Detalhes
                </button>
              </div>
            </div>

            {/* brilho suave no hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-linear-to-t from-purple-600/6 via-transparent to-transparent" />
          </motion.div>
        ))}
      </motion.section>

      {/* Modal com animação suave */}
      <AnimatePresence>
        {dialogAberto && campanhaSelecionada && (
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogContent className="max-w-4xl p-0 border-none bg-background/95 backdrop-blur-md sm:rounded-lg overflow-hidden">
              <DialogTitle className="sr-only">{campanhaSelecionada.nome}</DialogTitle>

              <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col max-h-[90vh]"
              >
                {/* Capa */}
                <div className="relative w-full shrink-0 h-60 md:h-72 overflow-hidden">
                  {campanhaSelecionada.capa ? (
                    <img src={campanhaSelecionada.capa} alt={`Capa ${campanhaSelecionada.nome}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">Sem imagem de capa</div>
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
                <div className="p-6 overflow-y-auto">
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
                      <p className="text-sm text-muted-foreground">Carregando personagens...</p>
                    ) : personagens.length > 0 ? (
                      <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}>
                        {personagens.map((p) => (
                          <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex items-center gap-3 rounded-md border p-3 bg-background/70 hover:bg-accent/10 transition">
                            {( (p as any).imagem_pixel ? (p as any).imagem_pixel : p.url_imagem) ? (
                              <img src={(p as any).imagem_pixel ? (p as any).imagem_pixel : p.url_imagem} alt={p.nome} className="w-12 h-12 rounded-md object-cover" />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                                <User2 className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium capitalize">{p.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.classe_nome && p.raca_nome ? `${p.classe_nome} ${p.raca_nome}` : p.classe_nome || p.raca_nome || 'Personagem'}
                              </p>
                              <p className="text-xs text-primary mt-1 capitalize">{p.elemento}</p>
                            </div>
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
                <div className="sticky bottom-0 border-t bg-background/95 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="text-sm text-muted-foreground">{campanhaSelecionada.count_jogadores ?? 0} jogadores registrados</div>
                  <div className="flex items-center gap-3">
                    <Link href={`/personagens/campanha/${campanhaSelecionada.id}`} className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-purple-600 text-white shadow hover:opacity-95 transition">
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
