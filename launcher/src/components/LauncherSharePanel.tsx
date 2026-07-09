import { Copy, ExternalLink, Share2, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { ShareState } from "../types";
import { ActionButton } from "./ActionButton";

type LauncherSharePanelProps = {
  open: boolean;
  state: ShareState;
  loading: boolean;
  error: string;
  onClose: () => void;
  onStart: () => void;
  onStop: () => void;
  onCopy: () => void;
  onOpenLink: () => void;
};

function friendlyMessage(state: ShareState, error: string) {
  if (error) return "Não foi possível criar o link temporário.";
  if (state.status === "preparing") return "Criando link temporário...";
  if (state.status === "stopping") return "Encerrando compartilhamento...";
  if (state.status === "active") return "Compartilhamento ativo.";
  return "Preparando compartilhamento...";
}

export function LauncherSharePanel({
  open,
  state,
  loading,
  error,
  onClose,
  onStart,
  onStop,
  onCopy,
  onOpenLink,
}: LauncherSharePanelProps) {
  const [qrCode, setQrCode] = useState<{
    publicUrl: string;
    dataUrl: string;
  } | null>(null);
  const publicUrl = state.publicUrl || "";
  const active = state.status === "active" && Boolean(publicUrl);
  const qrDataUrl =
    active && qrCode?.publicUrl === publicUrl ? qrCode.dataUrl : "";

  useEffect(() => {
    let disposed = false;
    if (!active) return;

    void QRCode.toDataURL(publicUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: "#06101f",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    }).then((nextQr) => {
      if (!disposed) setQrCode({ publicUrl, dataUrl: nextQr });
    });

    return () => {
      disposed = true;
    };
  }, [active, publicUrl]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog share-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-panel-title"
      >
        <div className="share-panel__header">
          <div>
            <h2 id="share-panel-title">Compartilhamento temporário</h2>
            <p>{friendlyMessage(state, error)}</p>
          </div>
          <button type="button" className="share-panel__close" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="share-panel__description">
          Qualquer pessoa com este link ou QR Code poderá acessar esta sessão enquanto o compartilhamento estiver ativo.
        </p>

        {active ? (
          <>
            <div className="share-panel__qr-wrap">
              {qrDataUrl ? (
                <img
                  className="share-panel__qr"
                  src={qrDataUrl}
                  alt="QR Code do link de compartilhamento temporário"
                />
              ) : (
                <span className="spinner" aria-label="Gerando QR Code" />
              )}
            </div>

            <p className="share-panel__url">{publicUrl}</p>

            <div className="share-panel__actions">
              <ActionButton icon={<Copy size={18} />} variant="secondary" onClick={onCopy}>
                Copiar link
              </ActionButton>
              <ActionButton icon={<ExternalLink size={18} />} variant="ghost" onClick={onOpenLink}>
                Abrir link
              </ActionButton>
              <ActionButton icon={<Square size={18} />} variant="danger" loading={loading} onClick={onStop}>
                Encerrar compartilhamento
              </ActionButton>
            </div>
          </>
        ) : (
          <div className="share-panel__empty">
            {error ? <p className="message message--warn">{error}</p> : null}
            <ActionButton
              icon={<Share2 size={18} />}
              variant="primary"
              loading={loading || state.status === "preparing"}
              onClick={onStart}
            >
              Criar link temporário
            </ActionButton>
          </div>
        )}
      </section>
    </div>
  );
}
