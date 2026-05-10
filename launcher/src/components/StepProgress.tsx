import { Check, Circle, Loader2, X } from "lucide-react";
import type { ProgressStep } from "../types";

type StepProgressProps = {
  steps: ProgressStep[];
};

export function StepProgress({ steps }: StepProgressProps) {
  return (
    <section className="step-progress" aria-label="Progresso">
      {steps.map((step) => (
        <div className={`step-progress__item step-progress__item--${step.state}`} key={step.id}>
          <span aria-hidden="true">
            {step.state === "done" ? <Check size={16} /> : null}
            {step.state === "running" ? <Loader2 size={16} /> : null}
            {step.state === "error" ? <X size={16} /> : null}
            {step.state === "pending" ? <Circle size={16} /> : null}
          </span>
          <span>{step.label}</span>
        </div>
      ))}
    </section>
  );
}
