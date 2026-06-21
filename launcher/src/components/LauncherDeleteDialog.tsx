import { useState } from "react";

type LauncherDeleteDialogProps = {
  open: boolean;
  installPath: string;
  runtimeMode?: string;
  onCancel: () => void;
  onConfirm: () => void;
  onCreateBackupFirst: () => void;
};

export function LauncherDeleteDialog({
  open,
  installPath,
  runtimeMode,
  onCancel,
  onConfirm,
  onCreateBackupFirst,
}: LauncherDeleteDialogProps) {
  const [typed, setTyped] = useState("");

  if (!open) return null;

  const isPortable = runtimeMode === "portable";
  const canConfirm = typed === "EXCLUIR";

  const portableDescription = (
    <>
      <p>Esta ação encerrará os serviços e apagará a pasta local do M&amp;G Pocket:</p>
      <p>
        <code>{installPath || "caminho não disponível"}</code>
      </p>
      <p>
        Serão apagados o sistema instalado, banco de dados, personagens, campanhas, imagens,
        configurações, logs e backups armazenados nessa pasta.
      </p>
      <p>O aplicativo do Launcher continuará instalado.</p>
    </>
  );

  const dockerDescription = (
    <>
      <p>
        Esta ação encerrará os containers do M&amp;G Pocket, removerá os volumes locais e apagará
        a pasta do projeto:
      </p>
      <p>
        <code>{installPath || "caminho não disponível"}</code>
      </p>
      <p>Docker e outras ferramentas instaladas no computador não serão removidos.</p>
    </>
  );

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog confirm-dialog--destructive"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
      >
        <h2 id="delete-dialog-title">Excluir instalação local</h2>

        <div id="delete-dialog-desc" className="confirm-dialog__description">
          {isPortable ? portableDescription : dockerDescription}

          <div className="delete-dialog__backup-hint">
            <p>
              Recomendamos criar e copiar um backup para outro local antes de continuar.
            </p>
            <button
              type="button"
              className="delete-dialog__backup-btn"
              onClick={onCreateBackupFirst}
            >
              Criar backup primeiro
            </button>
          </div>
        </div>

        <label className="confirm-dialog__confirmation-label">
          <span>Digite EXCLUIR para confirmar</span>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            autoComplete="off"
            aria-label="Confirmação de exclusão"
          />
        </label>

        <div className="confirm-dialog__actions">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            Excluir definitivamente
          </button>
        </div>
      </section>
    </div>
  );
}
