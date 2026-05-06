"use client";

import { useState } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { alterarStatusCampanha } from "@/services/campanhaApiService";
import type { CampanhaStatusValue } from "@/types/campanha";

type CampanhaStatusActionProps = {
  campanhaId: number;
  status?: CampanhaStatusValue;
  variant?: "default" | "outline";
  className?: string;
};

const ENCERRAR_CONFIRMATION =
  "Tem certeza que deseja encerrar esta campanha? Ela deixara de aparecer nas listagens principais, mas podera ser acessada pelas campanhas encerradas.";

export function CampanhaStatusAction({
  campanhaId,
  status = "ATIVA",
  variant = "outline",
  className,
}: CampanhaStatusActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const encerrada = status === "ENCERRADA";
  const Icon = encerrada ? RotateCcw : Archive;

  async function handleClick() {
    if (!encerrada && !window.confirm(ENCERRAR_CONFIRMATION)) {
      return;
    }

    setLoading(true);

    try {
      await alterarStatusCampanha(campanhaId, encerrada ? "ATIVA" : "ENCERRADA");
      toast.success(encerrada ? "Campanha reativada." : "Campanha encerrada.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao alterar status da campanha."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">
        {encerrada ? "Reativar campanha" : "Encerrar campanha"}
      </span>
      <span className="sm:hidden">{encerrada ? "Reativar" : "Encerrar"}</span>
    </Button>
  );
}

export function CampanhaEncerradaBanner() {
  return (
    <div className="border-b border-amber-500/35 bg-amber-500/12 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
      <div className="mx-auto max-w-7xl">
        Esta campanha foi encerrada. Voce esta visualizando uma campanha
        inativa.
      </div>
    </div>
  );
}
