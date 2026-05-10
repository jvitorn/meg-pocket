type LogPanelProps = {
  logs: string;
  onRefresh?: () => void;
  loading?: boolean;
};

export function LogPanel({ logs, onRefresh, loading = false }: LogPanelProps) {
  return (
    <section className="log-panel" aria-label="Logs">
      <div className="log-panel__header">
        <h2>Logs</h2>
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Carregando" : "Atualizar"}
        </button>
      </div>
      <pre>{logs || "Nenhum log carregado ainda."}</pre>
    </section>
  );
}
