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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deletarPersonagem } from "@/services/personagemService";

type Props = {
  id: number;
  nome: string;
  detalhe: string;
  imageSrc: string;
  createdAtLabel: string;
};

export function DashboardPersonagemCard({
  id,
  nome,
  detalhe,
  imageSrc,
  createdAtLabel,
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
              Registrado em {createdAtLabel}
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
          if (!nextOpen) {
            setConfirmDelete(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          {!confirmDelete ? (
            <>
              <DialogHeader>
                <DialogTitle>Gerenciar ficha</DialogTitle>
                <DialogDescription>
                  Escolha se deseja editar ou deletar a ficha de {nome}.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3">
                <Button asChild className="justify-start">
                  <Link href={`/personagens/novo?id=${id}`}>
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
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirmar exclusão</DialogTitle>
                <DialogDescription>
                  Essa ação remove a ficha e os vínculos de magias, perícias,
                  inventário e controles relacionados ao personagem.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/8 dark:text-red-100/80">
                {nome} será deletado permanentemente.
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={loadingDelete}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loadingDelete}
                >
                  {loadingDelete ? "Deletando..." : "Confirmar exclusão"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
