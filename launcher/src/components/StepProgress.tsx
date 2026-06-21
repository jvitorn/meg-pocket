import { Ban, Check, Circle, Loader2, X } from "lucide-react";
import type { ProgressStep } from "../types";

type StepProgressProps = {
  steps: ProgressStep[];
};

export function StepProgress({ steps }: StepProgressProps) {
  return (
    <section className="preparation-steps" aria-label="Etapas de preparação">
      <h2>Etapas de preparação</h2>
      <ol className="preparation-steps__list">
        {steps.map((step) => (
          <li className={`preparation-step preparation-step--${step.status}`} key={step.id}>
            <div className="preparation-step__header">
              <span className="preparation-step__icon" aria-hidden="true">
                {step.status === "success" ? <Check size={16} /> : null}
                {step.status === "running" ? <Loader2 size={16} /> : null}
                {step.status === "error" ? <X size={16} /> : null}
                {step.status === "cancelled" ? <Ban size={16} /> : null}
                {step.status === "pending" ? <Circle size={16} /> : null}
              </span>
              <span className="preparation-step__title">{step.title}</span>
            </div>
            <div className="preparation-step__track" aria-hidden="true">
              <span style={{ width: `${Math.max(0, Math.min(100, step.progress))}%` }} />
            </div>
            <p>{step.message || statusLabel(step.status)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function statusLabel(status: ProgressStep["status"]) {
  if (status === "success") return "Concluído.";
  if (status === "running") return "Em andamento.";
  if (status === "error") return "Erro.";
  if (status === "cancelled") return "Cancelado.";
  return "Aguardando.";
}
