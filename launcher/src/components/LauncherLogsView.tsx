import { Copy, Download, HelpCircle, RefreshCw, Trash2, Wrench, XCircle } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "./ActionButton";

type LogLevel = "all" | "info" | "warn" | "error";

type LauncherLogsViewProps = {
  logs: string;
  busy: boolean;
  loadingLogs: boolean;
  onRefresh: () => void;
  onRepair: () => void;
  onClose: () => void;
  onHelp: () => void;
};

function filterLogs(logs: string, level: LogLevel) {
  if (level === "all") return logs;
  return logs
    .split(/\r?\n/)
    .filter((line) => {
      if (level === "error") return line.includes("[erro]") || line.toLowerCase().includes("error");
      if (level === "warn") return line.toLowerCase().includes("warn") || line.toLowerCase().includes("aviso");
      return !line.includes("[erro]") && !line.toLowerCase().includes("error");
    })
    .join("\n");
}

export function LauncherLogsView({
  logs,
  busy,
  loadingLogs,
  onRefresh,
  onRepair,
  onClose,
  onHelp,
}: LauncherLogsViewProps) {
  const [level, setLevel] = useState<LogLevel>("all");
  const [displayLogs, setDisplayLogs] = useState<string | null>(null);

  const visibleLogs = displayLogs ?? logs;
  const filteredLogs = filterLogs(visibleLogs, level);

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(filteredLogs);
    } catch {
      // fallback
    }
  };

  const exportLogs = () => {
    const blob = new Blob([filteredLogs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mg-pocket-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearDisplay = () => setDisplayLogs("");

  return (
    <div className="logs-view">
      <div className="logs-view__center">
        <div className="logs-view__header">
          <h2>Detalhes técnicos</h2>
          <div className="logs-view__filters" role="group" aria-label="Filtrar logs">
            {(["all", "info", "warn", "error"] as LogLevel[]).map((l) => (
              <button
                key={l}
                type="button"
                className={`logs-view__filter${level === l ? " logs-view__filter--active" : ""}`}
                onClick={() => setLevel(l)}
                aria-pressed={level === l}
              >
                {l === "all" ? "Todos" : l === "info" ? "Informações" : l === "warn" ? "Avisos" : "Erros"}
              </button>
            ))}
          </div>
        </div>

        <pre className="logs-view__content" aria-label="Logs técnicos">
          {filteredLogs || "Nenhum log disponível."}
        </pre>
      </div>

      <aside className="logs-view__actions" aria-label="Ações de logs">
        <ActionButton
          icon={<RefreshCw size={18} />}
          variant="secondary"
          disabled={busy}
          loading={loadingLogs}
          onClick={onRefresh}
        >
          Atualizar
        </ActionButton>

        <ActionButton
          icon={<Copy size={18} />}
          variant="ghost"
          disabled={busy}
          onClick={() => void copyLogs()}
        >
          Copiar logs
        </ActionButton>

        <ActionButton
          icon={<Download size={18} />}
          variant="ghost"
          disabled={busy}
          onClick={exportLogs}
        >
          Exportar logs
        </ActionButton>

        <ActionButton
          icon={<Trash2 size={18} />}
          variant="ghost"
          disabled={busy}
          onClick={clearDisplay}
        >
          Limpar visualização
        </ActionButton>

        <ActionButton
          icon={<Wrench size={18} />}
          variant="ghost"
          disabled={busy}
          onClick={onRepair}
        >
          Reparar instalação
        </ActionButton>

        <ActionButton
          icon={<HelpCircle size={18} />}
          variant="ghost"
          disabled={false}
          onClick={onHelp}
        >
          Ajuda
        </ActionButton>

        <ActionButton
          icon={<XCircle size={18} />}
          variant="secondary"
          disabled={false}
          onClick={onClose}
        >
          Voltar
        </ActionButton>
      </aside>
    </div>
  );
}
