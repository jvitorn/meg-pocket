import type { ReactNode } from "react";

type StatusTone = "ok" | "warn" | "bad" | "idle";

export type StatusItem = {
  label: string;
  value: ReactNode;
  tone?: StatusTone;
};

type StatusCardProps = {
  title: string;
  icon?: ReactNode;
  items: StatusItem[];
};

function toneLabel(tone: StatusTone = "idle") {
  if (tone === "ok") return "ok";
  if (tone === "warn") return "atenção";
  if (tone === "bad") return "erro";
  return "info";
}

export function StatusCard({ title, icon, items }: StatusCardProps) {
  return (
    <section className="status-card" aria-label={title}>
      <div className="status-card__header">
        <span className="status-card__icon" aria-hidden="true">
          {icon}
        </span>
        <h2>{title}</h2>
      </div>
      <dl className="status-card__list">
        {items.map((item) => (
          <div className="status-card__row" key={item.label}>
            <dt>{item.label}</dt>
            <dd>
              <span className={`status-pill status-pill--${item.tone ?? "idle"}`}>
                <span className="status-pill__dot" aria-hidden="true" />
                <span className="sr-only">{toneLabel(item.tone)}</span>
                {item.value}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
