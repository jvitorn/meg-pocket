type ManualDadosProps = {
  valores?: string[];
};

export function ManualDados({ valores = ["d8", "d8"] }: ManualDadosProps) {
  return (
    <span className="inline-flex gap-2 align-middle" aria-hidden="true">
      {valores.map((valor, index) => (
        <span
          key={`${valor}-${index}`}
          className="flex size-[34px] items-center justify-center rounded-lg border-[1.5px] border-amber-600/45 bg-card font-display text-sm font-bold text-amber-700 shadow-sm dark:text-amber-600"
          style={{ transform: `rotate(${index % 2 === 0 ? "-5deg" : "4deg"})` }}
        >
          {valor}
        </span>
      ))}
    </span>
  );
}
