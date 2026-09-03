export function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`panel-surface p-3.5 flex flex-col gap-1.5 border-l-2 transition-colors ${
        accent
          ? "border-l-[var(--color-red)]"
          : "border-l-[var(--color-line-strong)]"
      }`}
    >
      <div className="eyebrow">{label}</div>
      <div
        className={`num text-2xl font-semibold leading-none tracking-tight ${
          accent ? "text-[var(--color-red)]" : "text-[var(--color-ink)]"
        }`}
      >
        {value}
      </div>
      {sub ? (
        <div className="text-[10.5px] text-[var(--color-muted-2)] leading-tight">
          {sub}
        </div>
      ) : null}
    </div>
  );
}
