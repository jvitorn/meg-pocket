"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Pencil, Plus, ScrollText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CampanhaInfoDialog,
  normalizeCampanhaTags,
  type CampanhaInfoValues,
} from "@/components/campanhas/campanha-info-dialog";
import {
  atualizarCampanha,
  criarCampanha,
} from "@/services/campanhaApiService";

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
  tags: string[];
  status?: "ATIVA" | "ENCERRADA";
};

type Props = {
  initialCampanhas: DashboardCampanhaItem[];
  initialCampanhasEncerradas?: DashboardCampanhaItem[];
  defaultMestre: string;
};

export function DashboardCampaignsSection({
  initialCampanhas,
  initialCampanhasEncerradas = [],
  defaultMestre,
}: Props) {
  const router = useRouter();
  const [campanhas, setCampanhas] = useState(initialCampanhas);
  const [campanhasEncerradas, setCampanhasEncerradas] = useState(
    initialCampanhasEncerradas
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archivedDialogOpen, setArchivedDialogOpen] = useState(false);
  const [editingCampanha, setEditingCampanha] =
    useState<DashboardCampanhaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCampanhas(initialCampanhas);
  }, [initialCampanhas]);

  useEffect(() => {
    setCampanhasEncerradas(initialCampanhasEncerradas);
  }, [initialCampanhasEncerradas]);

  async function handleCreateCampaign(values: CampanhaInfoValues) {
    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await criarCampanha({
        nome: values.nome,
        sinopse: values.sinopse,
        capa: values.capa,
        mestre: values.mestre,
        tags: normalizeCampanhaTags(values.tags),
      });

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
            status: createdCampaign.status ?? "ATIVA",
            tags: Array.isArray(createdCampaign.tags)
              ? createdCampaign.tags.map(String)
              : normalizeCampanhaTags(values.tags),
          },
          ...prev,
        ]);
      }

      toast.success("Campanha criada com sucesso.");
      setDialogOpen(false);
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

  async function handleEditCampaign(values: CampanhaInfoValues) {
    if (loading || !editingCampanha) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await atualizarCampanha(editingCampanha.id, {
        nome: values.nome,
        sinopse: values.sinopse,
        capa: values.capa,
        mestre: values.mestre,
        tags: normalizeCampanhaTags(values.tags),
      });

      const updated = data?.campanha;
      setCampanhas((current) =>
        current.map((campanha) =>
          campanha.id === editingCampanha.id
            ? {
                ...campanha,
                nome: updated?.nome ?? values.nome,
                sinopse: updated?.sinopse ?? values.sinopse,
                capa: updated?.capa ?? values.capa,
                mestre: updated?.mestre ?? values.mestre,
                tags: Array.isArray(updated?.tags)
                  ? updated.tags.map(String)
                  : normalizeCampanhaTags(values.tags),
                updatedAtLabel: "agora",
              }
            : campanha
        )
      );
      toast.success("Informações iniciais atualizadas.");
      setEditingCampanha(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível editar a campanha."
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

          <Button
            type="button"
            className="gap-2"
            onClick={() => setDialogOpen(true)}
          >
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setEditingCampanha(campanha)}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar informações iniciais
                        </Button>
                      ) : null}
                      <Button asChild size="sm" className="gap-2">
                        <Link href={`/campanhas/escudo/${campanha.id}`}>
                          <ExternalLink className="h-4 w-4" />
                          Abrir escudo
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

        <div className="mt-5 border-t border-border/60 pt-4">
          <button
            type="button"
            className="text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
            onClick={() => setArchivedDialogOpen(true)}
          >
            Clique aqui para verificar campanhas encerradas
          </button>
        </div>
      </section>

      {dialogOpen ? (
        <CampanhaInfoDialog
          open={dialogOpen}
          onOpenChange={(nextOpen) => {
            setDialogOpen(nextOpen);
            if (nextOpen) {
              return;
            }
            setError(null);
          }}
          title="Criar campanha"
          description="Cadastre a base da mesa agora. Depois voce pode evoluir a narrativa e os detalhes visuais."
          submitLabel="Criar campanha"
          loading={loading}
          error={error}
          initialValues={{
            nome: "",
            mestre: defaultMestre,
            capa: "",
            sinopse: "",
            tags: "",
          }}
          onSubmit={handleCreateCampaign}
        />
      ) : null}

      {editingCampanha ? (
        <CampanhaInfoDialog
          open={Boolean(editingCampanha)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingCampanha(null);
              setError(null);
            }
          }}
          title="Editar informações iniciais"
          description="Ajuste os dados públicos da campanha sem sair do dashboard."
          submitLabel="Salvar informações"
          loading={loading}
          error={error}
          initialValues={{
            nome: editingCampanha.nome,
            mestre: editingCampanha.mestre ?? "",
            capa: editingCampanha.capa ?? "",
            sinopse: editingCampanha.sinopse ?? "",
            tags: editingCampanha.tags.join(", "),
          }}
          onSubmit={handleEditCampaign}
        />
      ) : null}

      <CampanhasEncerradasDialog
        open={archivedDialogOpen}
        campanhas={campanhasEncerradas}
        onOpenChange={setArchivedDialogOpen}
      />
    </>
  );
}

function CampanhasEncerradasDialog({
  open,
  campanhas,
  onOpenChange,
}: {
  open: boolean;
  campanhas: DashboardCampanhaItem[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Campanhas encerradas</DialogTitle>
          <DialogDescription>
            Campanhas inativas ficam fora das listagens principais, mas podem
            ser consultadas pelo escudo.
          </DialogDescription>
        </DialogHeader>

        {campanhas.length > 0 ? (
          <div className="grid gap-3">
            {campanhas.map((campanha) => (
              <article
                key={campanha.id}
                className="rounded-lg border border-border/70 bg-card p-4 shadow-xs"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{campanha.nome}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mestre: {campanha.mestre || "Nao informado"} · Encerrada
                      ou atualizada em {campanha.updatedAtLabel}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {campanha.sinopse?.trim() || "Sem sinopse cadastrada."}
                    </p>
                  </div>
                  <Button asChild size="sm" className="shrink-0 gap-2">
                    <Link
                      href={`/campanhas/escudo/${campanha.id}`}
                      onClick={() => onOpenChange(false)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir escudo
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Nenhuma campanha encerrada encontrada.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
