import { ExternalLink, Play } from "lucide-react";
import type { LauncherViewState, SystemStatus } from "../types";
import { ActionButton } from "./ActionButton";
import { LauncherActions } from "./LauncherActions";
import { LauncherStatusPanel } from "./LauncherStatusPanel";

type LauncherMainViewProps = {
  viewState: LauncherViewState;
  status: SystemStatus | null;
  error: string;
  notice: string;
  busy: boolean;
  loadingStart: boolean;
  loadingStop: boolean;
  loadingUpdate: boolean;
  loadingBackup: boolean;
  onPrimaryAction: () => void;
  onStartServer: () => void;
  onStopServer: () => void;
  onOpenSite: () => void;
  onUpdate: () => void;
  onBackup: () => void;
  onRestoreBackup: () => void;
  onOpenLogs: () => void;
  onDelete: () => void;
  onRetry: () => void;
};

function primaryLabel(viewState: LauncherViewState) {
  if (viewState === "online") return "Abrir no navegador";
  if (viewState === "installed_stopped") return "Iniciar servidor";
  return "Iniciar servidor";
}

function primaryIcon(viewState: LauncherViewState) {
  if (viewState === "online") return <ExternalLink size={22} />;
  return <Play size={22} />;
}

export function LauncherMainView({
  viewState,
  status,
  error,
  notice,
  busy,
  loadingStart,
  loadingStop,
  loadingUpdate,
  loadingBackup,
  onPrimaryAction,
  onStartServer,
  onStopServer,
  onOpenSite,
  onUpdate,
  onBackup,
  onRestoreBackup,
  onOpenLogs,
  onDelete,
  onRetry,
}: LauncherMainViewProps) {
  const isError = viewState === "error";

  return (
    <div className="main-view">
      <div className="main-view__center">
        <LauncherStatusPanel
          viewState={viewState}
          status={status}
          error={error}
          appUrl={status?.appUrl}
        />

        {!isError ? (
          <div className="main-view__primary">
            <ActionButton
              icon={primaryIcon(viewState)}
              variant="primary"
              disabled={busy}
              loading={loadingStart}
              onClick={onPrimaryAction}
            >
              {primaryLabel(viewState)}
            </ActionButton>
          </div>
        ) : (
          <div className="main-view__error-actions">
            <button type="button" className="main-view__error-action" onClick={onRetry}>
              Tentar novamente
            </button>
            <button type="button" className="main-view__error-action" onClick={onOpenLogs}>
              Ver logs
            </button>
          </div>
        )}

        {notice ? (
          <div className="message message--ok" role="status">
            {notice}
          </div>
        ) : null}

        {error && !isError ? (
          <div className="message message--warn" role="status">
            {error}
          </div>
        ) : null}
      </div>

      <aside className="main-view__actions">
        <LauncherActions
          viewState={viewState}
          busy={busy}
          onStartServer={onStartServer}
          onStopServer={onStopServer}
          onOpenSite={onOpenSite}
          onUpdate={onUpdate}
          onBackup={onBackup}
          onRestoreBackup={onRestoreBackup}
          onOpenLogs={onOpenLogs}
          onDelete={onDelete}
          loadingStart={loadingStart}
          loadingStop={loadingStop}
          loadingUpdate={loadingUpdate}
          loadingBackup={loadingBackup}
        />
      </aside>
    </div>
  );
}
