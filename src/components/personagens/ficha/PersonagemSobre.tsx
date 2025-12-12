"use client";

import { useState, useCallback, startTransition } from "react";
import { toast } from "sonner";
import { PersonagemInterface } from "@/types";
import { setPersonagemValores } from "@/services/personagemService";

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
  setPersonagem: React.Dispatch<React.SetStateAction<PersonagemInterface | null>>;
}

export function PersonagemSobre({ personagem, setPersonagem }: Props) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState(personagem.sobre ?? "");
  const [saving, setSaving] = useState(false);

  /* Abrir modal — igual ao original */
  const handleAbrir = useCallback(() => {
    setTexto(personagem.sobre ?? "");
    setOpen(true);
  }, [personagem]);

  /* Salvar — igual ao original */
  const handleSalvar = useCallback(async () => {
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
  }, [texto, personagem, setPersonagem]);

  return (
    <>
      {/* SEÇÃO SOBRE — layout idêntico ao original */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Sobre
          </h3>

        {/* Botão igual ao original */}
          <button
            onClick={handleAbrir}
            className="text-xs px-2 py-1 rounded bg-white/4 hover:bg-white/6 transition"
          >
            Editar
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          {personagem.sobre ?? "Nenhuma descrição disponível."}
        </p>
      </div>

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
