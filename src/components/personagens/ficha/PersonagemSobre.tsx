"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState, useCallback, startTransition } from "react";
import { toast } from "sonner";
import { PersonagemInterface } from "@/types";
import { setPersonagemValores } from "@/services/personagemService";
import { FichaSection } from "./FichaSection";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

interface Props {
  personagem: PersonagemInterface;
  setPersonagem: Dispatch<SetStateAction<PersonagemInterface | null>>;
  canEdit: boolean;
}

export function PersonagemSobre({ personagem, setPersonagem, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState(personagem.sobre ?? "");
  const [saving, setSaving] = useState(false);

  /* Abrir modal — igual ao original */
  const handleAbrir = useCallback(() => {
    if (!canEdit) return;
    setTexto(personagem.sobre ?? "");
    setOpen(true);
  }, [canEdit, personagem]);

  /* Salvar — igual ao original */
  const handleSalvar = useCallback(async () => {
    if (!canEdit) return;
    const antigo = personagem.sobre ?? "";
    const novo = texto;

    // atualização otimista
    startTransition(() => {
      setPersonagem((p) => (p ? { ...p, sobre: novo } : p));
    });

    setSaving(true);

    try {
      await setPersonagemValores(personagem.id, "sobre", novo);
      toast.success("Descrição salva.");
      setOpen(false);
    } catch {
      // rollback
      setPersonagem((p) => (p ? { ...p, sobre: antigo } : p));
      toast.error("Erro ao salvar a descrição.");
    } finally {
      setSaving(false);
    }
  }, [canEdit, texto, personagem, setPersonagem]);

  return (
    <>
      <FichaSection
        title="Sobre"
        subtitle="História, personalidade e detalhes que dão vida à ficha."
        sectionId="sobre"
        tone="violet"
        action={
          <button
            onClick={handleAbrir}
            disabled={!canEdit}
            className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-xs text-violet-700 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/15"
          >
            Editar
          </button>
        }
      >
        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/80 p-4 dark:border-violet-500/20 dark:bg-violet-500/[0.07]">
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {personagem.sobre?.trim()
              ? personagem.sobre
              : "Nenhuma descrição disponível ainda para este personagem."}
          </p>
        </div>
      </FichaSection>

      {/* ------------------ DIALOG ORIGINAL ------------------ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Sobre</DialogTitle>

            <DialogDescription>
              Altere a descrição curta do personagem.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={6}
              className="w-full rounded-md bg-background/80 border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <DialogFooter>
            <div className="flex gap-2 justify-end w-full">
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>

              <Button onClick={handleSalvar} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
