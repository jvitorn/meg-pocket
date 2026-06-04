import type { ReactNode } from "react";
import { BookOpen, Dice5 } from "lucide-react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          <BookOpen size={26} />
          <Dice5 size={18} />
        </div>
        <div>
          <p>Sistema local para mestres de RPG</p>
          <h1>M&G Pocket Launcher</h1>
          <h2 className="sr-only">Launcher</h2>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
