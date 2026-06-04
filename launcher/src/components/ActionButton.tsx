import type { ReactNode } from "react";

type ActionButtonProps = {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => unknown | Promise<unknown>;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  title?: string;
  ariaLabel?: string;
};

export function ActionButton({
  children,
  icon,
  onClick,
  disabled = false,
  loading = false,
  variant = "secondary",
  title,
  ariaLabel,
}: ActionButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={`action-button action-button--${variant}`}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      type="button"
    >
      <span className="action-button__icon" aria-hidden="true">
        {loading ? <span className="spinner" /> : icon}
      </span>
      <span>{children}</span>
    </button>
  );
}
