import type { LauncherViewState, ShareState, SystemStatus } from "../types";

type LauncherStatusPanelProps = {
  viewState: LauncherViewState;
  status: SystemStatus | null;
  error: string;
  appUrl?: string;
  shareState: ShareState;
};

export function LauncherStatusPanel({ viewState, status, error, appUrl, shareState }: LauncherStatusPanelProps) {
  if (viewState === "error") {
    return (
      <div className="status-panel status-panel--error" role="status">
        <div className="status-panel__dot status-panel__dot--error" aria-hidden="true" />
        <h3>Não foi possível concluir esta etapa</h3>
        <p className="status-panel__message">{error}</p>
      </div>
    );
  }

  if (viewState === "online") {
    return (
      <div className="status-panel status-panel--online" role="status">
        <div className="status-panel__dot status-panel__dot--online" aria-hidden="true" />
        <h3>Servidor online</h3>
        <p className="status-panel__message">
          {shareState.status === "active"
            ? "Compartilhamento temporário ativo."
            : "O M&G Pocket está pronto para uso."}
        </p>
        {appUrl ? (
          <p className="status-panel__url">{appUrl}</p>
        ) : null}
      </div>
    );
  }

  if (viewState === "installed_stopped") {
    return (
      <div className="status-panel status-panel--stopped" role="status">
        <div className="status-panel__dot status-panel__dot--stopped" aria-hidden="true" />
        <h3>Servidor parado</h3>
        <p className="status-panel__message">
          Seus dados estão preservados. Inicie o servidor quando quiser usar o M&amp;G Pocket.
        </p>
      </div>
    );
  }

  return (
    <div className="status-panel status-panel--idle" role="status">
      <div className="status-panel__dot status-panel__dot--idle" aria-hidden="true" />
      <h3>{status ? "Verificando…" : "Aguardando…"}</h3>
    </div>
  );
}
