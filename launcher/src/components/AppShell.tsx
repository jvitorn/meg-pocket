import { BookOpen, Dice5 } from "lucide-react";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
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
      </header>
      <main>{children}</main>
    </div>
  );
}
