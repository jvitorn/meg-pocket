"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Minus, Plus } from "lucide-react";

interface StatDrawerProps {
  title: string;
  description?: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  current: number;
  max?: number;
  onUpdate: (novoValor: number) => Promise<void>;
  unitLabel?: string;
}

export function StatDrawer({
  title,
  description,
  open,
  setOpen,
  current,
  max,
  onUpdate,
  unitLabel = "",
}: StatDrawerProps) {
  const [localValue, setLocalValue] = useState<number>(Math.max(0, current));

  useEffect(() => {
    if (open) setLocalValue(Math.max(0, current));
  }, [open, current]);

  const inc = useCallback(
    (n: number) => {
      setLocalValue((prev) => {
        const novo = prev + n;
        if (typeof max === "number") return Math.min(Math.max(0, novo), max);
        return Math.max(0, novo);
      });
    },
    [max]
  );

  const handleConfirm = useCallback(async () => {
    try {
      await onUpdate(localValue);
      setOpen(false);
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      // opcional: adicionar toast ou feedback visual
    }
  }, [localValue, onUpdate, setOpen]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
          </DrawerHeader>

          <div className="p-4 pb-0">
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => inc(-1)}
                aria-label={`Diminuir ${unitLabel}`}
                disabled={localValue <= 0}
              >
                <Minus />
              </Button>

              <div className="flex-1 text-center">
                <div className="text-6xl font-bold tracking-tighter">
                  {localValue}
                </div>
                <div className="text-muted-foreground text-[0.70rem] uppercase">
                  {unitLabel}
                  {typeof max === "number" ? ` / ${max}` : ""}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => inc(1)}
                aria-label={`Aumentar ${unitLabel}`}
                disabled={typeof max === "number" && localValue >= max}
              >
                <Plus />
              </Button>
            </div>

            <div className="mt-4 text-sm text-muted-foreground text-center">
              Use os botões para ajustar o valor, em seguida confirme.
            </div>
          </div>

          <DrawerFooter>
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm}>Confirmar</Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
