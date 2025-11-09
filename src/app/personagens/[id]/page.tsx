"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { LoadingSpinner } from "@/components/loadingSpinner";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sparkles, Leaf, Droplet, Flame, Wind } from "lucide-react";

import { PersonagemInterface, MagiaPersonagem } from "@/types";
import { setPersonagemValores } from "@/services/personagemService";
import { StatDrawer } from "@/components/stat-drawer";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

/* ---------- tipos e dados de elementos ---------- */
type ElementType = "natureza" | "agua" | "fogo" | "vento";

interface Element {
  type: ElementType;
  icon: any;
  color: string;
  bgColor: string;
}

const elements: Record<ElementType, Element> = {
  natureza: {
    type: "natureza",
    icon: Leaf,
    color: "text-green-900",
    bgColor: "bg-green-500",
  },
  agua: {
    type: "agua",
    icon: Droplet,
    color: "text-blue-900",
    bgColor: "bg-blue-500",
  },
  fogo: {
    type: "fogo",
    icon: Flame,
    color: "text-red-900",
    bgColor: "bg-red-500",
  },
  vento: {
    type: "vento",
    icon: Wind,
    color: "text-gray-700",
    bgColor: "bg-gray-300",
  },
};

/* ---------- componente da página ---------- */
export default function PersonagemUnicoPage() {
  const { id } = useParams<{ id: string }>();
  const [personagem, setPersonagem] = useState<PersonagemInterface | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawers HP / Mana
  const [hpDrawerOpen, setHpDrawerOpen] = useState(false);
  const [manaDrawerOpen, setManaDrawerOpen] = useState(false);

  // Magia dialog
  const [selectedMagia, setSelectedMagia] = useState<MagiaPersonagem | null>(
    null
  );
  const [magiaDialogOpen, setMagiaDialogOpen] = useState(false);
  const [magiaAtualizando, setMagiaAtualizando] = useState(false);

  // Edit Sobre dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSobre, setEditingSobre] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);

  /* fetch personagem */
  useEffect(() => {
    if (!id) return;
    const fetchPersonagem = async () => {
      try {
        const res = await fetch(`/api/personagem/${id}`);
        if (!res.ok) throw new Error("Erro ao carregar personagem");
        const data: PersonagemInterface = await res.json();
        setPersonagem(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchPersonagem();
  }, [id]);

  /* atualizar HP */
  const handleAtualizarHP = useCallback(
    async (novoValor: number) => {
      if (!personagem) return;
      const novoHP = Math.max(0, Math.min(personagem.hp || 30, novoValor));
      try {
        await setPersonagemValores(personagem.index, "hp_atual", novoHP);
        setPersonagem((p) => (p ? { ...p, hp_atual: novoHP } : p));
        toast.success(`HP atualizado: ${novoHP}`);
      } catch (err) {
        console.error("Erro ao atualizar HP:", err);
        toast.error("Não foi possível atualizar o HP.");
        throw err;
      }
    },
    [personagem]
  );

  /* atualizar Mana */
  const handleAtualizarMana = useCallback(
    async (novoValor: number) => {
      if (!personagem) return;
      const novaMana = Math.max(0, Math.min(personagem.mana || 0, novoValor));
      try {
        await setPersonagemValores(personagem.index, "mana_atual", novaMana);
        setPersonagem((p) => (p ? { ...p, mana_atual: novaMana } : p));
        toast.success(`Mana atualizada: ${novaMana}`);
      } catch (err) {
        console.error("Erro ao atualizar Mana:", err);
        toast.error("Não foi possível atualizar a mana.");
        throw err;
      }
    },
    [personagem]
  );

  /* abrir magia */
  const handleAbrirMagia = useCallback((magia: MagiaPersonagem) => {
    setSelectedMagia(magia);
    setMagiaDialogOpen(true);
  }, []);

  /* ativar magia (consome mana) */
  const handleAtivarMagia = useCallback(async () => {
    if (!personagem || !selectedMagia) return;
    const custo = Number(selectedMagia.custo_nivel ?? 0);
    const manaAtual = Number(personagem.mana_atual ?? 0);

    if (manaAtual < custo) {
      toast.error("Mana insuficiente para essa magia.");
      return;
    }

    const novaMana = manaAtual - custo;
    try {
      setMagiaAtualizando(true);
      await setPersonagemValores(personagem.index, "mana_atual", novaMana);
      setPersonagem((p) => (p ? { ...p, mana_atual: novaMana } : p));
      setMagiaDialogOpen(false);
      setSelectedMagia(null);
      toast.success(`${selectedMagia?.nome} conjurada — mana -${custo}`);
    } catch (err) {
      console.error("Erro ao ativar magia:", err);
      toast.error("Falha ao conjurar magia.");
    } finally {
      setMagiaAtualizando(false);
    }
  }, [personagem, selectedMagia]);

  /* abrir dialog de edição do sobre */
  const handleAbrirEditarSobre = useCallback(() => {
    setEditingSobre(personagem?.sobre ?? "");
    setEditDialogOpen(true);
  }, [personagem?.sobre]);

  /* salvar sobre */
  const handleSalvarSobre = useCallback(async () => {
    if (!personagem) return;
    try {
      setEditSaving(true);
      await setPersonagemValores(personagem.index, "sobre", editingSobre);
      setPersonagem((p) => (p ? { ...p, sobre: editingSobre } : p));
      setEditDialogOpen(false);
      toast.success("Descrição salva.");
    } catch (err) {
      console.error("Erro ao salvar sobre:", err);
      toast.error("Erro ao salvar a descrição.");
    } finally {
      setEditSaving(false);
    }
  }, [personagem, editingSobre]);

  /* elemento visual */
  const characterElement: ElementType = useMemo(() => {
    const vals: ElementType[] = ["natureza", "agua", "fogo", "vento"];
    return vals.includes(personagem?.elemento as ElementType)
      ? (personagem?.elemento as ElementType)
      : "natureza";
  }, [personagem?.elemento]);

  const currentElement = elements[characterElement];
  const ElementIcon = currentElement.icon;

  if (loading) return <LoadingSpinner />;
  if (error)
    return <div className="text-center mt-6 text-red-500">Erro: {error}</div>;

  /* percentuais para barras */
  const hpPercent =
    personagem && personagem.hp
      ? Math.round(((personagem.hp_atual ?? 0) / personagem.hp) * 100)
      : 0;
  const manaPercent =
    personagem && personagem.mana
      ? Math.round(((personagem.mana_atual ?? 0) / personagem.mana) * 100)
      : 0;

  return (
    <>
      <Navbar />
      <Toaster position="top-right" />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Ficha
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Informações sobre seu personagem
          </p>
        </header>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          {/* Card: desktop/tablet layout improved */}
          <Card className="overflow-hidden shadow-lg bg-background border border-border">
            {/* grid on md+: left column fixed, right fluid */}
            <div className="md:grid md:grid-cols-[280px_1fr] gap-6 p-4 md:p-6">
              {/* coluna esquerda (sticky em md) */}
              <aside className="flex flex-col items-center md:items-start gap-3 md:sticky md:top-20">
                <div className="flex flex-col items-center gap-3 w-full">
                  {/* AVATAR - SEMPRE CENTRALIZADO */}
                  <div className="flex justify-center w-full">
                    <div
                      className="flex-none rounded-full overflow-hidden border-2 border-primary/20"
                      style={{
                        width: 192,
                        height: 192,
                        minWidth: 128,
                        minHeight: 128,
                      }}
                    >
                      <Avatar className="w-full h-full">
                        <AvatarImage
                          src={personagem?.url_imagem}
                          alt={personagem?.nome}
                          className="w-full h-full object-cover"
                        />
                        <AvatarFallback className="w-full h-full flex items-center justify-center text-2xl md:text-3xl font-bold">
                          {personagem?.nome?.slice(0, 2)?.toUpperCase() ?? "??"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* NOME E TAGS - SEMPRE EMBAIXO DO AVATAR */}
                  <div className="w-full text-center">
                    <h1 className="text-xl md:text-2xl font-bold text-foreground capitalize">
                      {personagem?.nome}
                    </h1>
                    <div className="mt-1 md:mt-2 flex flex-wrap gap-2 justify-center">
                      {personagem?.classe_nome && (
                        <span className="px-2 py-0.5 bg-primary/10 rounded text-xs font-medium">
                          {personagem.classe_nome}
                        </span>
                      )}
                      {personagem?.raca_nome && (
                        <span className="px-2 py-0.5 bg-primary/10 rounded text-xs font-medium">
                          {personagem.raca_nome}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* barras (compactas em md) */}
                <div className="w-full mt-2 space-y-3">
                  {/* Vida */}
                  <div>
                    <div className="flex justify-between items-center text-[12px] text-muted-foreground mb-1">
                      <span className="font-medium">Vida</span>
                      <span className="text-xs" aria-live="polite">
                        {personagem?.hp_atual ?? 0}/{personagem?.hp ?? 0}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/6 overflow-hidden">
                      <motion.div
                        className="h-full bg-red-500"
                        initial={false}
                        animate={{
                          width: `${Math.max(0, Math.min(100, hpPercent))}%`,
                        }}
                        transition={{ type: "tween", duration: 0.45 }}
                      />
                    </div>
                  </div>

                  {/* Mana */}
                  <div>
                    <div className="flex justify-between items-center text-[12px] text-muted-foreground mb-1">
                      <span className="font-medium">Mana</span>
                      <span className="text-xs" aria-live="polite">
                        {personagem?.mana_atual ?? 0}/{personagem?.mana ?? 0}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded bg-white/6 overflow-hidden">
                      <motion.div
                        className="h-full bg-purple-600"
                        initial={false}
                        animate={{
                          width: `${Math.max(0, Math.min(100, manaPercent))}%`,
                        }}
                        transition={{ type: "tween", duration: 0.45 }}
                      />
                    </div>
                  </div>

                  {/* quick actions */}
                  <div className="mt-2 flex gap-2 w-full">
                    <button
                      onClick={() => setHpDrawerOpen(true)}
                      className="flex-1 rounded-md px-3 py-2 bg-white/4 hover:bg-white/6 transition text-sm font-medium"
                      aria-label="Atualizar vida"
                    >
                      Atualizar HP
                    </button>
                    <button
                      onClick={() => setManaDrawerOpen(true)}
                      className="flex-1 rounded-md px-3 py-2 bg-white/4 hover:bg-white/6 transition text-sm font-medium"
                      aria-label="Atualizar mana"
                    >
                      Atualizar Mana
                    </button>
                  </div>
                </div>
              </aside>

              {/* coluna direita: elemento (em cima) e magias (embaixo) */}
              <section className="flex-1">
                {/* ELEMENTO (em cima) */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Elemento
                  </h3>
                  <div
                    className={`mt-2 p-3 rounded-md flex items-center gap-3 ${currentElement.bgColor} ${currentElement.color} bg-opacity-95`}
                  >
                    <ElementIcon className="w-5 h-5" />
                    <span className="font-semibold capitalize">
                      {characterElement}
                    </span>
                  </div>
                </div>

                {/* SOBRE */}
                <div className="mb-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                      Sobre
                    </h3>
                    <button
                      onClick={handleAbrirEditarSobre}
                      className="text-xs px-2 py-1 rounded bg-white/4 hover:bg-white/6 transition"
                      aria-label="Editar sobre"
                    >
                      Editar
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                    {personagem?.sobre ?? "Nenhuma descrição disponível."}
                  </p>
                </div>

                {/* MAGIAS (embaixo) - cards um pouco maiores em desktop */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                      Magias
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Toque em uma magia para ver detalhes.
                    </p>
                  </div>

                  <div className="mt-2 space-y-3">
                    {personagem?.magias && personagem.magias.length > 0 ? (
                      personagem.magias.map((magia, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAbrirMagia(magia)}
                          className="w-full text-left bg-white/3 hover:bg-white/6 transition p-4 rounded-md flex items-start justify-between gap-4 md:p-5"
                          aria-label={`Abrir magia ${magia.nome}`}
                        >
                          <div className="flex items-start gap-4">
                            <Sparkles className="w-6 h-6 mt-0.5 text-primary" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm md:text-base">
                                {magia.nome}
                              </div>
                              <div className="text-xs md:text-sm text-muted-foreground line-clamp-2 md:line-clamp-3">
                                {magia.descricao}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 self-start">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-background text-muted-foreground border border-border">
                              {typeof magia.custo_nivel === "number"
                                ? `${magia.custo_nivel}`
                                : "-"}
                              <span className="sr-only"> pontos de mana</span>
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma magia encontrada
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </Card>
        </motion.div>

        {/* Drawers reutilizáveis */}
        <StatDrawer
          title="Atualizar Vida"
          description="Informe a quantidade de vida atual."
          open={hpDrawerOpen}
          setOpen={setHpDrawerOpen}
          current={personagem?.hp_atual ?? 0}
          max={personagem?.hp}
          onUpdate={handleAtualizarHP}
          unitLabel="HP"
        />

        <StatDrawer
          title="Atualizar Mana"
          description="Informe a quantidade de mana atual."
          open={manaDrawerOpen}
          setOpen={setManaDrawerOpen}
          current={personagem?.mana_atual ?? 0}
          max={personagem?.mana}
          onUpdate={handleAtualizarMana}
          unitLabel="Mana"
        />

        {/* Dialog de magia (confirm + ativar) */}
        <Dialog open={magiaDialogOpen} onOpenChange={setMagiaDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedMagia?.nome ?? "Confirmar magia"}
              </DialogTitle>
              <DialogDescription>
                Custo: {selectedMagia?.custo_nivel ?? 0} mana
              </DialogDescription>
            </DialogHeader>

            <div className="p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {selectedMagia?.descricao}
              </p>
            </div>

            <DialogFooter>
              <div className="flex gap-2 w-full justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button
                  onClick={handleAtivarMagia}
                  disabled={
                    magiaAtualizando ||
                    (personagem?.mana_atual ?? 0) <
                      (selectedMagia?.custo_nivel ?? 0)
                  }
                  title={
                    (personagem?.mana_atual ?? 0) <
                    (selectedMagia?.custo_nivel ?? 0)
                      ? "Mana insuficiente"
                      : undefined
                  }
                >
                  {magiaAtualizando ? "Ativando..." : "Ativar"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de editar 'Sobre' */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Sobre</DialogTitle>
              <DialogDescription>
                Altere a descrição curta do personagem.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4">
              <textarea
                value={editingSobre}
                onChange={(e) => setEditingSobre(e.target.value)}
                rows={6}
                className="w-full rounded-md bg-background/80 border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Editar sobre do personagem"
              />
            </div>

            <DialogFooter>
              <div className="flex gap-2 w-full justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSalvarSobre} disabled={editSaving}>
                  {editSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </>
  );
}
