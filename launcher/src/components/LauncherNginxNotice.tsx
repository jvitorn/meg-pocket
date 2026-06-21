const NGINX_NOTICE_KEY = "mg-pocket-launcher-nginx-notice-accepted";

type LauncherNginxNoticeProps = {
  open: boolean;
  onAccept: () => void;
};

export function LauncherNginxNotice({ open, onAccept }: LauncherNginxNoticeProps) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nginx-notice-title"
      >
        <h2 id="nginx-notice-title">Permissão de rede do Windows</h2>
        <div className="confirm-dialog__description">
          <p>
            Na primeira execução, o Windows pode pedir autorização para o Nginx.
          </p>
          <p>
            Esse componente funciona somente neste computador. Ele ajuda o M&amp;G Pocket a exibir
            as imagens armazenadas localmente e encaminha o acesso para o site em localhost.
          </p>
          <p>
            Ele <strong>não</strong> publica suas campanhas ou personagens na internet.
          </p>
          <p>
            Caso a janela do Windows apareça, permita somente em{" "}
            <strong>redes privadas</strong>. Não é necessário permitir em redes públicas.
          </p>
        </div>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="dialog-button--primary"
            onClick={onAccept}
          >
            Entendi e continuar
          </button>
        </div>
      </section>
    </div>
  );
}

export function hasAcceptedNginxNotice(): boolean {
  try {
    return window.localStorage.getItem(NGINX_NOTICE_KEY) === "true";
  } catch {
    return false;
  }
}

export function acceptNginxNotice(): void {
  try {
    window.localStorage.setItem(NGINX_NOTICE_KEY, "true");
  } catch {
    // ignore
  }
}
