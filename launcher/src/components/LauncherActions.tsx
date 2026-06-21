import {
  Archive,
  Play,
  RefreshCw,
  ScrollText,
  Share2,
  Square,
  Trash2,
} from "lucide-react";
import type { LauncherViewState, ShareState } from "../types";
import { ActionButton } from "./ActionButton";

type LauncherActionsProps = {
  viewState: LauncherViewState;
  busy: boolean;
  shareState: ShareState;
  onStartServer: () => void;
  onStopServer: () => void;
  onShare: () => void;
  onUpdate: () => void;
  onBackup: () => void;
  onRestoreBackup: () => void;
  onOpenLogs: () => void;
  onDelete: () => void;
  loadingStart: boolean;
  loadingStop: boolean;
  loadingShare: boolean;
  loadingUpdate: boolean;
  loadingBackup: boolean;
};

export function LauncherActions({
  viewState,
  busy,
  shareState,
  onStartServer,
  onStopServer,
  onShare,
  onUpdate,
  onBackup,
  onRestoreBackup,
  onOpenLogs,
  onDelete,
  loadingStart,
  loadingStop,
  loadingShare,
  loadingUpdate,
  loadingBackup,
}: LauncherActionsProps) {
  const isOnline = viewState === "online";
  const isShareActive = shareState.status === "active";

  return (
    <div className="launcher-actions" aria-label="Ações do servidor">
      {isOnline ? (
        <>
          <ActionButton
            icon={<Share2 size={18} />}
            variant={isShareActive ? "secondary" : "ghost"}
            disabled={busy}
            loading={loadingShare || shareState.status === "preparing"}
            onClick={onShare}
          >
            {isShareActive ? "Gerenciar compartilhamento" : "Compartilhar sessão"}
          </ActionButton>
          <ActionButton
            icon={<Square size={18} />}
            variant="secondary"
            disabled={busy}
            loading={loadingStop}
            onClick={onStopServer}
          >
            Parar servidor
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
