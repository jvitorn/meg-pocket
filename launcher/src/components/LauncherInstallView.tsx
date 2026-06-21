import { BookOpen, Dice5, HelpCircle, Wrench } from "lucide-react";
import { ActionButton } from "./ActionButton";

type LauncherInstallViewProps = {
  launcherVersion?: string;
  runtimeLabel?: string;
  onInstall: () => void;
  onHelp: () => void;
  busy: boolean;
  loading: boolean;
};

export function LauncherInstallView({
  launcherVersion,
  runtimeLabel,
  onInstall,
  onHelp,
  busy,
  loading,
}: LauncherInstallViewProps) {
  return (
    <div className="install-view">
      <div className="install-view__visual" aria-hidden="true">
        <div className="install-view__brand">
          <BookOpen size={48} />
          <Dice5 size={28} />
        </div>
      </div>

      <div className="install-view__content">
        <h2 className="install-view__title">M&amp;G Pocket</h2>
        <p className="install-view__description">
          Seu sistema local para gerenciar campanhas, personagens e sessões de RPG.
        </p>
        <p className="install-view__hint">
          O launcher instalará tudo o que o M&amp;G Pocket precisa para funcionar neste computador.
        </p>

        <div className="install-view__actions">
          <ActionButton
            icon={<Wrench size={22} />}
            variant="primary"
            disabled={busy}
            loading={loading}
            onClick={onInstall}
            ariaLabel="Instalar M&G Pocket"
          >
            Instalar M&amp;G Pocket
          </ActionButton>
          <p className="install-view__footnote">
            A instalação pode levar alguns minutos na primeira vez.
          </p>
        </div>
      </div>

      <div className="install-view__footer">
        {launcherVersion ? <span>Launcher {launcherVersion}</span> : null}
        {runtimeLabel ? <span>Modo: {runtimeLabel}</span> : null}
        <button
          type="button"
          className="install-view__help-link"
          onClick={onHelp}
          aria-label="Abrir primeiros passos"
        >
          <HelpCircle size={14} aria-hidden="true" />
          Primeiros passos
        </button>
      </div>
    </div>
  );
}
