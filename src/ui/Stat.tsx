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
      className={`panel-surface p-3.5 flex flex-col gap-1.5 ${
        accent ? "panel-surface-glow" : ""
      }`}
    >
      <div className="eyebrow">{label}</div>
      <div
        className={`num font-[var(--font-display)] text-[length:var(--fs-screen)] font-light leading-none tracking-tight ${
          accent ? "text-[var(--color-accent-text)]" : "text-[var(--color-ink)]"
        }`}
      >
        {value}
      </div>
      {sub ? (
        <div className="text-[12px] text-[var(--color-muted-2)] leading-tight">
          {sub}
        </div>
      ) : null}
    </div>
  );
}
