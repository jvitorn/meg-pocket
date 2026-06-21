import {
  Archive,
  ExternalLink,
  Play,
  RefreshCw,
  ScrollText,
  Square,
  Trash2,
} from "lucide-react";
import type { LauncherViewState } from "../types";
import { ActionButton } from "./ActionButton";

type LauncherActionsProps = {
  viewState: LauncherViewState;
  busy: boolean;
  onStartServer: () => void;
  onStopServer: () => void;
  onOpenSite: () => void;
  onUpdate: () => void;
  onBackup: () => void;
  onRestoreBackup: () => void;
  onOpenLogs: () => void;
  onDelete: () => void;
  loadingStart: boolean;
  loadingStop: boolean;
  loadingUpdate: boolean;
  loadingBackup: boolean;
};

export function LauncherActions({
  viewState,
  busy,
  onStartServer,
  onStopServer,
  onOpenSite,
  onUpdate,
  onBackup,
  onRestoreBackup,
  onOpenLogs,
  onDelete,
  loadingStart,
  loadingStop,
  loadingUpdate,
  loadingBackup,
}: LauncherActionsProps) {
  const isOnline = viewState === "online";

  return (
    <div className="launcher-actions" aria-label="Ações do servidor">
      {isOnline ? (
        <>
          <ActionButton
            icon={<Square size={18} />}
            variant="secondary"
            disabled={busy}
            loading={loadingStop}
            onClick={onStopServer}
          >
            Parar servidor
          </ActionButton>
          <ActionButton
            icon={<ExternalLink size={18} />}
            variant="ghost"
            disabled={busy}
            onClick={onOpenSite}
          >
            Abrir no navegador
          </ActionButton>
        </>
      ) : (
        <ActionButton
          icon={<Play size={18} />}
          variant="secondary"
          disabled={busy}
          loading={loadingStart}
          onClick={onStartServer}
        >
          Iniciar servidor
        </ActionButton>
      )}

      <ActionButton
        icon={<RefreshCw size={18} />}
        variant="ghost"
        disabled={busy}
        loading={loadingUpdate}
        onClick={onUpdate}
      >
        Atualizar
      </ActionButton>

      <ActionButton
        icon={<Archive size={18} />}
        variant="ghost"
        disabled={busy}
        loading={loadingBackup}
        onClick={onBackup}
      >
        Criar backup
      </ActionButton>

      <ActionButton
        icon={<Archive size={18} />}
        variant="ghost"
        disabled={busy}
        onClick={onRestoreBackup}
      >
        Restaurar backup
      </ActionButton>

      <ActionButton
        icon={<ScrollText size={18} />}
        variant="ghost"
        disabled={busy}
        onClick={onOpenLogs}
      >
        Logs
      </ActionButton>

      <ActionButton
        icon={<Trash2 size={18} />}
        variant="danger"
        disabled={busy}
        onClick={onDelete}
      >
        Excluir instalação
      </ActionButton>
    </div>
  );
}
