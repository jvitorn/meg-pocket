"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rolarNotacao, type ResultadoRolagem } from "@/lib/regras/rolagemDados";

type RolagemAcaoProps = {
  notacao: string;
  titulo?: string;
  descricao?: string;
  buttonLabel?: string;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
};

export function RolagemAcao({
  notacao,
  titulo = "Resultado da rolagem",
  descricao = "Confira abaixo o resultado da rolagem.",
  buttonLabel = "Rolar",
  buttonVariant = "secondary",
  buttonSize = "default",
  disabled = false,
}: RolagemAcaoProps) {
  const [open, setOpen] = useState(false);
  const [resultado, setResultado] = useState<ResultadoRolagem | null>(null);

  function handleRolar() {
    try {
      const novaRolagem = rolarNotacao(notacao);
      setResultado(novaRolagem);
      setOpen(true);
    } catch {
      toast.error("Notação de rolagem inválida.");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleRolar}
        disabled={disabled}
      >
        <Dices className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descricao}</DialogDescription>
          </DialogHeader>

          {resultado ? (
            <div className="space-y-4">
              <div className="rounded-xl border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Resultado
                </p>
                <p className="mt-1 text-3xl font-bold">{resultado.total}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Detalhes
                </p>
                <p className="mt-1 text-sm text-muted-foreground wrap-break-word">
                  {resultado.output}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
