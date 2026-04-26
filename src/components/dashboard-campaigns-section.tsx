"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, ScrollText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type DashboardCampanhaItem = {
  id: number;
  nome: string;
  sinopse: string | null;
  capa: string | null;
  mestre: string | null;
  countPersonagens: number;
  createdAtLabel: string;
  updatedAtLabel: string;
  isOwner: boolean;
};

type Props = {
  initialCampanhas: DashboardCampanhaItem[];
  defaultMestre: string;
};

function normalizeTags(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function DashboardCampaignsSection({
  initialCampanhas,
  defaultMestre,
}: Props) {
  const router = useRouter();
  const [campanhas, setCampanhas] = useState(initialCampanhas);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [sinopse, setSinopse] = useState("");
  const [capa, setCapa] = useState("");
  const [mestre, setMestre] = useState(defaultMestre);
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreateCampaign() {
    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/campanhas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          sinopse,
          capa,
          mestre,
          tags: normalizeTags(tags),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Não foi possível criar a campanha.");
        return;
      }

      const createdCampaign = data?.campanha;

      if (createdCampaign?.id) {
        setCampanhas((prev) => [
          {
            id: createdCampaign.id,
            nome: createdCampaign.nome,
            sinopse: createdCampaign.sinopse ?? null,
            capa: createdCampaign.capa ?? null,
            mestre: createdCampaign.mestre ?? null,
            countPersonagens: 0,
            createdAtLabel: "agora",
            updatedAtLabel: "agora",
            isOwner: true,
          },
          ...prev,
        ]);
      }

      toast.success("Campanha criada com sucesso.");
      setDialogOpen(false);
      setNome("");
      setSinopse("");
      setCapa("");
      setTags("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar a campanha."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Campanhas
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Mesas que voce conduz
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Aqui ficam suas campanhas criadas e as mesas em que voce aparece
              como mestre.
            </p>
          </div>

          <Button type="button" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Criar campanha
          </Button>
        </div>

        {campanhas.length > 0 ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {campanhas.map((campanha) => (
              <article
                key={campanha.id}
                className="overflow-hidden rounded-2xl border border-border/60 bg-background/80"
              >
                <div className="relative h-36 overflow-hidden border-b border-border/60">
                  {campanha.capa ? (
                    <Image
                      src={campanha.capa}
                      alt={`Capa da campanha ${campanha.nome}`}
                      fill
                      sizes="(max-width: 1280px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-amber-500/20 via-emerald-500/10 to-sky-500/15 text-sm text-muted-foreground">
                      Sem capa
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/25 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {campanha.nome}
                      </h3>
                      <p className="text-xs text-white/80">
                        Mestre: {campanha.mestre || "Nao informado"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                      {campanha.countPersonagens} ficha
                      {campanha.countPersonagens !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="rounded-full border border-border/60 px-2 py-1">
                      {campanha.isOwner ? "Criada por voce" : "Mestrando"}
                    </span>
                    <span className="rounded-full border border-border/60 px-2 py-1">
                      Atualizada em {campanha.updatedAtLabel}
                    </span>
                  </div>

                  <p className="min-h-12 text-sm text-muted-foreground">
                    {campanha.sinopse?.trim() ||
                      "Ainda sem sinopse. Abra a mesa e comece a registrar sua historia."}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Criada em {campanha.createdAtLabel}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/campanhas">Ver vitrine</Link>
                      </Button>
                      {campanha.isOwner ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/campanhas/editar/${campanha.id}`}>
                            Editar campanha
                          </Link>
                        </Button>
                      ) : null}
                      <Button asChild size="sm">
                        <Link href={`/personagens/campanha/${campanha.id}`}>
                          Abrir campanha
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-background/60 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background">
              <ScrollText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              Nenhuma campanha criada ainda
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Abra sua primeira mesa e depois convide os jogadores para montar
              as fichas em torno dela.
            </p>
            <Button
              type="button"
              className="mt-5 gap-2"
              onClick={() => setDialogOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Criar primeira campanha
            </Button>
          </div>
        )}
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (nextOpen) {
            return;
          }
          setError(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar campanha</DialogTitle>
            <DialogDescription>
              Cadastre a base da mesa agora. Depois voce pode evoluir a
              narrativa e os detalhes visuais.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="campanha-nome">Nome</FieldLabel>
              <Input
                id="campanha-nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex: As Ruinas de Valthera"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="campanha-mestre">Mestre</FieldLabel>
              <Input
                id="campanha-mestre"
                value={mestre}
                onChange={(event) => setMestre(event.target.value)}
                placeholder="Seu nome de mestre"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="campanha-capa">URL da capa</FieldLabel>
              <Input
                id="campanha-capa"
                value={capa}
                onChange={(event) => setCapa(event.target.value)}
                placeholder="https://..."
              />
              <FieldDescription>
                Opcional. Se deixar vazio, a campanha usa um painel tematico.
              </FieldDescription>
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel htmlFor="campanha-sinopse">Sinopse</FieldLabel>
              <textarea
                id="campanha-sinopse"
                rows={4}
                value={sinopse}
                onChange={(event) => setSinopse(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Descreva o clima, o conflito central ou a promessa da aventura."
              />
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel htmlFor="campanha-tags">Tags</FieldLabel>
              <Input
                id="campanha-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="fantasia sombria, ruinas, diplomacia"
              />
              <FieldDescription>
                Opcional. Separe as tags por virgula.
              </FieldDescription>
            </Field>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateCampaign}
              disabled={loading}
            >
              {loading ? "Criando..." : "Criar campanha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
