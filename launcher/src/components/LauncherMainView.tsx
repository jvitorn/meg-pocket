import { ExternalLink, Play } from "lucide-react";
import type { LauncherViewState, LocalStorageStatus, ShareState, SystemStatus } from "../types";
import { ActionButton } from "./ActionButton";
import { LauncherActions } from "./LauncherActions";
import { LauncherStoragePanel } from "./LauncherStoragePanel";
import { LauncherStatusPanel } from "./LauncherStatusPanel";

type LauncherMainViewProps = {
  viewState: LauncherViewState;
  status: SystemStatus | null;
  error: string;
  notice: string;
  busy: boolean;
  loadingStart: boolean;
  loadingStop: boolean;
  loadingShare: boolean;
  loadingUpdate: boolean;
  loadingBackup: boolean;
  shareState: ShareState;
  storageStatus: LocalStorageStatus | null;
  loadingStorage: boolean;
  onPrimaryAction: () => void;
  onStartServer: () => void;
  onStopServer: () => void;
  onShare: () => void;
  onUpdate: () => void;
  onBackup: () => void;
  onRestoreBackup: () => void;
  onOpenLogs: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onOpenInstallationFolder: () => void;
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
  loadingShare,
  loadingUpdate,
  loadingBackup,
  shareState,
  storageStatus,
  loadingStorage,
  onPrimaryAction,
  onStartServer,
  onStopServer,
  onShare,
  onUpdate,
  onBackup,
  onRestoreBackup,
  onOpenLogs,
  onDelete,
  onRetry,
  onOpenInstallationFolder,
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
          shareState={shareState}
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

        <LauncherStoragePanel
          status={status}
          storage={storageStatus}
          loading={loadingStorage}
          onOpenFolder={onOpenInstallationFolder}
        />
      </div>

      <aside className="main-view__actions">
        <LauncherActions
          viewState={viewState}
          busy={busy}
          shareState={shareState}
          onStartServer={onStartServer}
          onStopServer={onStopServer}
          onShare={onShare}
          onUpdate={onUpdate}
          onBackup={onBackup}
          onRestoreBackup={onRestoreBackup}
          onOpenLogs={onOpenLogs}
          onDelete={onDelete}
          loadingStart={loadingStart}
          loadingStop={loadingStop}
          loadingShare={loadingShare}
          loadingUpdate={loadingUpdate}
          loadingBackup={loadingBackup}
        />
      </aside>
    </div>
  );
}
