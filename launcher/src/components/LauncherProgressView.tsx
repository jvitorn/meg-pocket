import { ScrollText } from "lucide-react";
import type { JobStatus, LauncherJobEvent, ProgressStep } from "../types";
import { StepProgress } from "./StepProgress";

type LauncherProgressViewProps = {
  jobStatus: JobStatus;
  jobEvent: LauncherJobEvent | null;
  steps: ProgressStep[];
  recentJobLogs: string[];
  transferDetail: string | null;
  onCancel: () => void;
  onOpenLogs: () => void;
};

function progressTitle(jobStatus: JobStatus, action?: string) {
  if (jobStatus === "success") return "Concluído";
  if (jobStatus === "error") return "Não foi possível concluir";
  if (jobStatus === "cancelled") return "Cancelado";
  return action || "Preparando M&G Pocket";
}

function progressDetail(jobStatus: JobStatus, message?: string, error?: string) {
  if (jobStatus === "error") return error || message || "Não foi possível concluir esta etapa.";
  return message || "Aguardando…";
}

function friendlyMessage(message: string | undefined, jobStatus: JobStatus) {
  if (!message) return null;
  if (jobStatus === "running") {
    if (message.toLowerCase().includes("download") || message.toLowerCase().includes("baix")) {
      return "Baixando os arquivos necessários.";
    }
    if (message.toLowerCase().includes("extra")) {
      return "Extraindo os arquivos do sistema. Esta etapa pode levar alguns minutos.";
    }
    if (message.toLowerCase().includes("banco") || message.toLowerCase().includes("postgres")) {
      return "Preparando o banco de dados local.";
    }
    if (message.toLowerCase().includes("next") || message.toLowerCase().includes("nginx") || message.toLowerCase().includes("inicia")) {
      return "Iniciando os serviços do M&G Pocket.";
    }
    if (message.toLowerCase().includes("acesso") || message.toLowerCase().includes("health")) {
      return "Verificando se tudo está pronto para abrir.";
    }
  }
  return null;
}

export function LauncherProgressView({
  jobStatus,
  jobEvent,
  steps,
  recentJobLogs,
  transferDetail,
  onCancel,
  onOpenLogs,
}: LauncherProgressViewProps) {
  const progress = Math.max(0, Math.min(100, jobEvent?.progress ?? 0));
  const title = progressTitle(jobStatus, jobEvent?.action);
  const detail = progressDetail(jobStatus, jobEvent?.message, undefined);
  const friendly = friendlyMessage(jobEvent?.message, jobStatus) ?? detail;

  const isDone = jobStatus !== "running";

  return (
    <div className="progress-view">
      <div className="progress-view__header">
        <div>
          <h2 className="progress-view__title">{title}</h2>
          <p
            className="progress-view__detail"
            aria-live="polite"
            role={isDone ? "status" : undefined}
          >
            {friendly}
          </p>
        </div>
        <span className="progress-view__percent">{progress}%</span>
      </div>

      <div
        className={`progress-view__track progress-view__track--${jobStatus}`}
        role="progressbar"
        aria-label={`Progresso ${progress}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      {transferDetail ? (
        <p className="progress-view__transfer">{transferDetail}</p>
      ) : null}

      {recentJobLogs.length > 0 ? (
        <ul className="progress-view__logs" aria-live="polite" aria-atomic="false">
          {recentJobLogs.map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      ) : null}

      <div className="progress-view__steps">
        <StepProgress steps={steps} />
      </div>

      <div className="progress-view__footer">
        {jobStatus === "running" ? (
          <button
            type="button"
            className="progress-view__cancel"
            onClick={onCancel}
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="button"
          className="progress-view__details-link"
          onClick={onOpenLogs}
        >
          <ScrollText size={14} aria-hidden="true" />
          Ver detalhes técnicos
        </button>
      </div>
    </div>
  );
}
