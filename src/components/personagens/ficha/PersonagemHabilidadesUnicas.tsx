"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, PanelRightOpen, RotateCcw, Sparkles } from "lucide-react";
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
import {
  marcarHabilidadeDiariaUsada,
  resetarHabilidadeDiaria,
} from "@/services/personagemService";
import type { PersonagemInterface } from "@/types";
import { cn } from "@/lib/utils";

type UniqueAbility = {
  id: "raca";
  name: string;
  combate: string | null;
  foraDeCombate: string | null;
  available: boolean;
};

type Props = {
  personagem: PersonagemInterface;
  canEdit: boolean;
};

export function PersonagemHabilidadesUnicas({ personagem, canEdit }: Props) {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [open, setOpen] = useState(false);
  const [isUsed, setIsUsed] = useState(Boolean(personagem.habilidadeDiariaUsada));
  const [saving, setSaving] = useState(false);

  const ability = useMemo<UniqueAbility>(
    () => ({
      id: "raca",
      name: personagem.habilidadeDiariaNome?.trim() || "Talento racial",
      combate: personagem.habilidadeDiariaCombate?.trim() || null,
      foraDeCombate: personagem.habilidadeDiariaForaDeCombate?.trim() || null,
      available: Boolean(
        personagem.habilidadeDiariaCombate?.trim() ||
          personagem.habilidadeDiariaForaDeCombate?.trim()
      ),
    }),
    [personagem]
  );

  async function markUsed() {
    if (!canEdit || saving) return;
    const previous = isUsed;

    setIsUsed(true);
    setSaving(true);

    try {
      await marcarHabilidadeDiariaUsada(personagem.id);
      toast.success("Habilidade marcada como usada.");
    } catch (error) {
      setIsUsed(previous);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar o uso."
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    if (!canEdit || saving) return;
    const previous = isUsed;

    setIsUsed(false);
    setSaving(true);

    try {
      await resetarHabilidadeDiaria(personagem.id);
      toast.success("Habilidade racial resetada.");
    } catch (error) {
      setIsUsed(previous);
      toast.error(
        error instanceof Error ? error.message : "Erro ao resetar habilidade."
      );
    } finally {
      setSaving(false);
    }
  }

  const trigger = (
    <Button
      type="button"
      variant="outline"
      className="h-8 rounded-full border-rose-300 bg-rose-50 px-3 text-xs text-rose-800 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
    >
      <PanelRightOpen className="h-3.5 w-3.5" />
      Abrir
    </Button>
  );

  const statusLabel = ability.available
    ? isUsed
      ? "Habilidade usada"
      : "Habilidade disponível"
    : "Sem habilidade cadastrada";

  const statusText = ability.available
    ? isUsed
      ? "Esta habilidade racial já foi marcada como usada nesta sessão."
      : "Esta habilidade racial ainda pode ser usada uma vez."
    : "Esta raça ainda não possui habilidade diária cadastrada para a ficha.";

  const section = (
    <section
      id="habilidades"
      className="scroll-mt-32 rounded-2xl border border-rose-200 bg-linear-to-br from-rose-100 via-card to-card p-4 shadow-sm dark:border-rose-500/20 dark:from-rose-500/10 dark:via-card/92 dark:to-card/82"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rose-600 dark:text-rose-300" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-100">
              Habilidade racial
            </h3>
          </div>

          <p className="text-sm text-rose-800/80 dark:text-rose-100/75">
            Um uso diário da raça.
          </p>
        </div>

        {isMobile ? (
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        ) : (
          <SheetTrigger asChild>{trigger}</SheetTrigger>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 dark:border-rose-500/20 dark:bg-rose-500/[0.07]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-rose-700/80 dark:text-rose-100/75">
              {personagem.raca_nome ?? "Raça"}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {ability.name}
            </p>
            <p className="mt-0.5 text-xs text-rose-800/80 dark:text-rose-100/75">
              {statusLabel}
            </p>
          </div>

          <AbilityUsageIndicator isUsed={isUsed} available={ability.available} />
        </div>
      </div>
    </section>
  );

  const details = (
    <div className="space-y-5">
      <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/[0.07]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700/80 dark:text-rose-100/75">
              {personagem.raca_nome ?? "Raça"}
            </p>
            <h4 className="mt-1 text-xl font-semibold text-foreground">{ability.name}</h4>
            <p
              className={cn(
                "mt-2 text-sm leading-relaxed",
                isUsed
                  ? "text-rose-800/85 dark:text-rose-100/75"
                  : "text-emerald-700 dark:text-emerald-100/80"
              )}
            >
              {statusText}
            </p>
          </div>

          <AbilityUsageIndicator isUsed={isUsed} available={ability.available} />
        </div>
      </div>

      {ability.available ? (
        <div className="grid gap-3">
          <AbilityTextBlock
            title="Em combate"
            text={ability.combate ?? "Sem efeito de combate cadastrado."}
          />
          <AbilityTextBlock
            title="Fora de combate"
            text={ability.foraDeCombate ?? "Sem efeito fora de combate cadastrado."}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-rose-200 bg-rose-50/70 p-4 text-sm italic text-rose-800/80 dark:border-rose-500/20 dark:bg-rose-500/[0.07] dark:text-rose-100/75">
            Sem habilidade racial cadastrada para esta ficha.
        </p>
      )}
    </div>
  );

  const abilityActions = (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button
        type="button"
        onClick={markUsed}
        disabled={!canEdit || !ability.available || isUsed || saving}
        className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400"
      >
        <CheckCircle2 className="h-4 w-4" />
        {saving && !isUsed ? "Salvando..." : "Marcar como usada"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={resetAll}
        disabled={!canEdit || !isUsed || saving}
        className="border-rose-300 bg-background text-rose-800 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
      >
        <RotateCcw className="h-4 w-4" />
        {saving && isUsed ? "Salvando..." : "Resetar uso"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {section}

        <DrawerContent className="max-h-[90vh]">
          <div className="mx-auto flex min-h-0 w-full max-w-xl flex-col">
            <DrawerHeader className="text-left">
              <DrawerTitle>Habilidade racial</DrawerTitle>
              <DrawerDescription>
                Consulte o efeito e marque o uso sem ocupar a ficha.
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-h-0 overflow-y-auto px-4 pb-4">{details}</div>

            <DrawerFooter className="border-t border-border/70 bg-background/95">
              {abilityActions}
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

      <SheetContent side="right" className="w-full border-l-rose-500/10 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Habilidade racial</SheetTitle>
          <SheetDescription>
            Consulte o efeito e controle o uso diário deste recurso.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {details}
          {abilityActions}
        </div>

        <SheetFooter className="mt-6">
          <SheetClose asChild>
            <Button type="button" variant="outline">
              Fechar
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function AbilityUsageIndicator({
  isUsed,
  available,
}: {
  isUsed: boolean;
  available: boolean;
}) {
  const label = !available ? "Sem registro" : isUsed ? "Usada" : "Disponível";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "h-3.5 w-3.5 rounded-full border transition",
          !available
            ? "border-muted-foreground/30 bg-transparent"
            : isUsed
              ? "border-rose-500 bg-rose-500"
              : "border-emerald-500 bg-emerald-500"
        )}
      />
      <span className="ml-1 text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function AbilityTextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{text}</p>
    </div>
  );
}
