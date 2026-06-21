import { BookOpen, Dice5, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  onHelp?: () => void;
};

export function AppShell({ children, onHelp }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden="true" />
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          <BookOpen size={20} />
          <Dice5 size={13} />
        </div>
        <span className="brand-title">M&amp;G Pocket</span>
        <h2 className="sr-only">Launcher</h2>
        <div className="app-header__spacer" />
        {onHelp ? (
          <button
            type="button"
            className="app-header__help"
            onClick={onHelp}
            aria-label="Ajuda"
            title="Ajuda"
          >
            <HelpCircle size={18} aria-hidden="true" />
            <span>Ajuda</span>
          </button>
        ) : null}
      </header>
      <main>{children}</main>
    </div>
  );
}
