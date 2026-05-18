import { type ReactNode, useState } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmationText?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  extraActions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "danger" | "secondary";
    disabled?: boolean;
  }>;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmationText,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmVariant = "danger",
  extraActions = [],
  actions,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  if (!open) return null;

  const canConfirm = !confirmationText || typed === confirmationText;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <div className="confirm-dialog__description">{description}</div>
        {confirmationText ? (
          <label>
            <span>Digite {confirmationText}</span>
            <input value={typed} onChange={(event) => setTyped(event.target.value)} autoFocus />
          </label>
        ) : null}
        <div className="confirm-dialog__actions">
          {actions ? (
            actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={action.variant ? `dialog-button--${action.variant}` : undefined}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))
          ) : (
            <>
              <button type="button" onClick={onCancel}>
                {cancelLabel}
              </button>
              {extraActions.map((action) => (
                <button key={action.label} type="button" onClick={action.onClick}>
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                className={confirmVariant === "danger" ? "danger-button" : "dialog-button--primary"}
                onClick={onConfirm}
                disabled={!canConfirm}
              >
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
