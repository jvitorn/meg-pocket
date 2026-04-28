"use client";

import type { Dispatch, SetStateAction } from "react";
import { startTransition, useCallback, useEffect, useState } from "react";
import { BookText, Eraser, NotebookPen, PanelLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { setPersonagemValores } from "@/services/personagemService";
import type { PersonagemInterface } from "@/types";

const LIMITE_ANOTACOES = 20000;

type Props = {
  personagem: PersonagemInterface;
  setPersonagem: Dispatch<SetStateAction<PersonagemInterface | null>>;
  canEdit: boolean;
};

type EditorLayoutProps = {
  canEdit: boolean;
  hasMudancas: boolean;
  hasTextoSalvo: boolean;
  saving: boolean;
  texto: string;
  onChangeTexto: (value: string) => void;
  onLimpar: () => Promise<void>;
  isMobile: boolean;
};

function EditorLayout({
  canEdit,
  hasMudancas,
  hasTextoSalvo,
  saving,
  texto,
  onChangeTexto,
  onLimpar,
  isMobile,
}: EditorLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="border-b border-border/60 bg-muted/20 p-4 lg:w-64 lg:border-b-0 lg:border-r">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Navegação
        </p>

        <div className={isMobile ? "flex items-center gap-2" : "space-y-2"}>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-100 px-3 py-3 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/12 dark:text-cyan-100">
            <BookText className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Texto</p>
              <p className="truncate text-xs text-cyan-800/80 dark:text-cyan-100/75">
                Área livre para anotar a sessão.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border/60 bg-background/80 p-3 text-xs text-muted-foreground">
          <p>{texto.length} caractere(s)</p>
          <p className="mt-1">
            {hasMudancas ? "Existem alterações pendentes." : "Tudo salvo."}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={onLimpar}
          disabled={!canEdit || saving || (!hasTextoSalvo && !texto.trim())}
          className="mt-4 w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Eraser className="h-4 w-4" />
          Limpar anotações
        </Button>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Bloco de escrita
            </p>
          </div>

          <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-500/12 dark:text-cyan-100">
            {texto.length}/{LIMITE_ANOTACOES}
          </span>
        </div>

        <textarea
          value={texto}
          onChange={(event) => onChangeTexto(event.target.value)}
          disabled={!canEdit || saving}
          maxLength={LIMITE_ANOTACOES}
          placeholder="Escreva aqui pistas, objetivos, nomes importantes, lembretes e qualquer detalhe da sessão..."
          className={[
            "w-full flex-1 resize-none rounded-2xl border border-border bg-background/95 p-4 text-sm leading-relaxed outline-none transition",
            "focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20",
            "disabled:cursor-not-allowed disabled:opacity-70",
            isMobile ? "min-h-[50svh]" : "min-h-[60svh]",
          ].join(" ")}
        />

        <p className="mt-3 text-xs text-muted-foreground">
          {canEdit
            ? "O rascunho fica localmente na tela até você salvar."
            : "Você está em modo de visualização e não pode editar este campo."}
        </p>
      </div>
    </div>
  );
}

export function PersonagemAnotacoes({
  personagem,
  setPersonagem,
  canEdit,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [texto, setTexto] = useState(personagem.anotacoes ?? "");

  useEffect(() => {
    if (!open) return;
    setTexto(personagem.anotacoes ?? "");
  }, [open, personagem.anotacoes]);

  const anotacoesSalvas = personagem.anotacoes ?? "";
  const hasTextoSalvo = Boolean(anotacoesSalvas.trim());
  const hasMudancas = texto !== anotacoesSalvas;

  const handleSalvar = useCallback(async () => {
    if (!canEdit || saving) {
      return;
    }

    const antigo = anotacoesSalvas;
    const novo = texto;

    startTransition(() => {
      setPersonagem((current) =>
        current ? { ...current, anotacoes: novo } : current
      );
    });

    setSaving(true);

    try {
      await setPersonagemValores(personagem.id, "anotacoes", novo);
      toast.success("Anotações salvas.");
      setOpen(false);
    } catch {
      setPersonagem((current) =>
        current ? { ...current, anotacoes: antigo } : current
      );
      toast.error("Erro ao salvar as anotações.");
    } finally {
      setSaving(false);
    }
  }, [
    anotacoesSalvas,
    canEdit,
    personagem.id,
    saving,
    setPersonagem,
    texto,
  ]);

  const handleLimpar = useCallback(async () => {
    if (!canEdit || saving) {
      return;
    }

    const confirmar = window.confirm(
      "Deseja limpar todas as anotações deste personagem?"
    );

    if (!confirmar) {
      return;
    }

    const antigo = anotacoesSalvas;

    startTransition(() => {
      setPersonagem((current) =>
        current ? { ...current, anotacoes: "" } : current
      );
    });
    setTexto("");
    setSaving(true);

    try {
      await setPersonagemValores(personagem.id, "anotacoes", "");
      toast.success("Anotações limpas.");
    } catch {
      setPersonagem((current) =>
        current ? { ...current, anotacoes: antigo } : current
      );
      setTexto(antigo);
      toast.error("Erro ao limpar as anotações.");
    } finally {
      setSaving(false);
    }
  }, [anotacoesSalvas, canEdit, personagem.id, saving, setPersonagem]);

  const trigger = (
    <Button
      type="button"
      variant="outline"
      disabled={!canEdit}
      className="rounded-full border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100"
    >
      <PanelLeft className="h-4 w-4" />
      Abrir
    </Button>
  );

  const section = (
    <section
      id="anotacoes"
      className="scroll-mt-32 rounded-2xl border border-cyan-200 bg-linear-to-br from-cyan-100 via-card to-card p-4 shadow-sm dark:border-cyan-500/20 dark:from-cyan-500/10 dark:via-card/92 dark:to-card/82"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-100">
              Anotações
            </h3>
          </div>

          <p className="text-sm text-cyan-800/80 dark:text-cyan-100/75">
            Abra um painel dedicado para escrever durante a sessão.
          </p>
        </div>

        {isMobile ? (
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        ) : (
          <SheetTrigger asChild>{trigger}</SheetTrigger>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-cyan-700/80 dark:text-cyan-100/75">
        <span className="rounded-full border border-cyan-300 bg-cyan-50 px-2.5 py-1 dark:border-cyan-500/30 dark:bg-cyan-500/10">
          {hasTextoSalvo ? "Com anotações salvas" : "Sem anotações ainda"}
        </span>
      </div>
    </section>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {section}

        <DrawerContent className="data-[vaul-drawer-direction=bottom]:h-[94svh] data-[vaul-drawer-direction=bottom]:max-h-[94svh] overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <DrawerHeader className="border-b border-border/60 text-left">
              <DrawerTitle>Bloco de anotações</DrawerTitle>
              <DrawerDescription>
                Um espaço simples para escrever com conforto no celular.
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <EditorLayout
                canEdit={canEdit}
                hasMudancas={hasMudancas}
                hasTextoSalvo={hasTextoSalvo}
                saving={saving}
                texto={texto}
                onChangeTexto={setTexto}
                onLimpar={handleLimpar}
                isMobile
              />
            </div>

            <DrawerFooter className="border-t border-border/60 bg-background/95 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur">
              <Button
                type="button"
                onClick={handleSalvar}
                disabled={!canEdit || saving || !hasMudancas}
                className="bg-cyan-600 text-white hover:bg-cyan-600/90"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar anotações"}
              </Button>

              <DrawerClose asChild>
                <Button type="button" variant="outline">
                  Fechar
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {section}

      <SheetContent side="right" className="w-full p-0 sm:max-w-5xl">
        <SheetHeader className="border-b border-border/60 text-left">
          <SheetTitle>Bloco de anotações</SheetTitle>
          <SheetDescription>
            Um espaço simples para registrar tudo o que precisa acompanhar a
            ficha.
          </SheetDescription>
        </SheetHeader>

        <EditorLayout
          canEdit={canEdit}
          hasMudancas={hasMudancas}
          hasTextoSalvo={hasTextoSalvo}
          saving={saving}
          texto={texto}
          onChangeTexto={setTexto}
          onLimpar={handleLimpar}
          isMobile={false}
        />

        <SheetFooter className="border-t border-border/60 bg-background sm:flex-row sm:justify-end">
          <SheetClose asChild>
            <Button type="button" variant="outline">
              Fechar
            </Button>
          </SheetClose>

          <Button
            type="button"
            onClick={handleSalvar}
            disabled={!canEdit || saving || !hasMudancas}
            className="bg-cyan-600 text-white hover:bg-cyan-600/90"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar anotações"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
