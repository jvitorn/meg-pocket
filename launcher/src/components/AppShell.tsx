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
          <p>M&G Pocket</p>
          <h1>Launcher</h1>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
