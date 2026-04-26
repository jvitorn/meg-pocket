"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Settings, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deletarPersonagem } from "@/services/personagemService";

type Props = {
  id: number;
  nome: string;
  detalhe: string;
  imageSrc: string;
  createdAtLabel: string;
  updatedAtLabel: string;
  campanhaNome: string;
  elemento: string;
  hpAtual: number | null;
  hpMax: number;
  manaAtual: number | null;
  manaMax: number;
  defesaAtual: number;
  defesaMax: number;
};

function StatBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function DashboardPersonagemCard({
  id,
  nome,
  detalhe,
  imageSrc,
  createdAtLabel,
  updatedAtLabel,
  campanhaNome,
  elemento,
  hpAtual,
  hpMax,
  manaAtual,
  manaMax,
  defesaAtual,
  defesaMax,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  async function handleDelete() {
    if (loadingDelete) {
      return;
    }

    try {
      setLoadingDelete(true);
      await deletarPersonagem(id);
      toast.success("Ficha deletada com sucesso.");
      setOpen(false);
      setConfirmDelete(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível deletar a ficha."
      );
    } finally {
      setLoadingDelete(false);
    }
  }

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border bg-card/80 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-amber-400 via-emerald-400 to-sky-500 opacity-70" />

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{nome}</h3>
                <p className="text-sm text-muted-foreground">{detalhe}</p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-md border border-border/60 bg-background/70 text-muted-foreground"
                onClick={() => {
                  setConfirmDelete(false);
                  setOpen(true);
                }}
                aria-label={`Gerenciar ficha de ${nome}`}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              {campanhaNome} • {elemento}
            </p>

            <div className="mt-4 grid gap-2">
              <StatBar
                label="HP"
                value={hpAtual ?? hpMax}
                max={hpMax}
                tone="bg-rose-500"
              />
              <StatBar
                label="Mana"
                value={manaAtual ?? manaMax}
                max={manaMax}
                tone="bg-sky-500"
              />
              { defesaAtual > 0 &&
              <StatBar
                label="Defesa"
                value={defesaAtual}
                max={defesaMax}
                tone="bg-emerald-500"
              />}
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Criado em {createdAtLabel} • Atualizado em {updatedAtLabel}
            </p>

            <Button asChild size="sm" className="mt-4">
              <Link href={`/personagens/${id}`}>Acessar Ficha</Link>
            </Button>
          </div>

          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={nome}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted to-muted/40 text-sm font-semibold text-muted-foreground">
                {nome.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar ficha</DialogTitle>
            <DialogDescription>
              Escolha se deseja editar ou deletar a ficha de {nome}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Button asChild className="justify-start">
              <Link href={`/fichas/novo?id=${id}`}>
                <Pencil className="h-4 w-4" />
                Editar ficha
              </Link>
            </Button>

            <Button
              type="button"
              variant="destructive"
              className="justify-start"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Deletar ficha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ficha permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove {nome} e os vínculos de magias, perícias,
              inventário e controles relacionados ao personagem.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Esta ação não pode ser desfeita.
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingDelete}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loadingDelete}>
              {loadingDelete ? "Excluindo..." : "Excluir ficha"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
