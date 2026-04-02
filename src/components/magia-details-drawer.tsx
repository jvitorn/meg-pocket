"use client";

import type { ReactNode } from "react";
import { Crosshair, Droplets, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export type MagiaDetailsLike = {
  id?: string | number;
  nome: string;
  descricao?: string | null;
  alcance?: string | null;
  custo_nivel?: number | null;
};

type MagiaDetailsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  magia: MagiaDetailsLike | null;
  description?: string;
  contextBadge?: string;
  closeLabel?: string;
  footerAction?: ReactNode;
};

export function MagiaDetailsDrawer({
  open,
  onOpenChange,
  magia,
  description = "Detalhes da magia.",
  contextBadge,
  closeLabel = "Fechar",
  footerAction,
}: MagiaDetailsDrawerProps) {
  const descricao = magia?.descricao?.trim() || "Sem descrição disponível.";
  const shouldSuggestScroll =
    descricao.length > 180 || (descricao.match(/\n/g)?.length ?? 0) > 2;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90svh]">
        <div className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden">
          <DrawerHeader className="border-b border-border/60 text-left">
            <div className="flex items-center">
              
              <div className="min-w-0 flex-1 space-y-1">
                {contextBadge && (
                  <span className="inline-flex w-fit rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {contextBadge}
                  </span>
                )}

                <div className="space-y-1">
                  <DrawerTitle className="text-lg leading-tight">
                    {magia?.nome ?? "Magia"}
                  </DrawerTitle>
                  <DrawerDescription>{description}</DrawerDescription>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                    <Crosshair className="h-3.5 w-3.5" />
                    <span>Alcance: {magia?.alcance?.trim() || "-"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                    <Droplets className="h-3.5 w-3.5" />
                    <span>
                      Custo:{" "}
                      {typeof magia?.custo_nivel === "number"
                        ? magia.custo_nivel
                        : "-"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </DrawerHeader>

          <div className="px-4 pt-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <span>Descricao</span>
              <span
                className={cn(
                  "transition-opacity",
                  shouldSuggestScroll ? "opacity-100" : "opacity-0"
                )}
              >
                Role para ler tudo
              </span>
            </div>

            <div className="relative">
              <div className="max-h-[min(52svh,420px)] overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-muted/20 px-4 py-4 pr-3 text-sm leading-6 shadow-inner scrollbar-thin scrollbar-thumb-foreground/20 scrollbar-track-transparent">
                <p className="whitespace-pre-wrap">{descricao}</p>
              </div>

              {shouldSuggestScroll && (
                <div className="pointer-events-none absolute inset-x-1 bottom-0 h-10 rounded-b-2xl bg-linear-to-t from-background via-background/80 to-transparent" />
              )}
            </div>
          </div>

          <DrawerFooter className="border-t border-border/60 bg-background">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {closeLabel}
              </Button>
              {footerAction}
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
