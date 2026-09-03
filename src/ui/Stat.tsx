export function Stat({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="panel-surface p-3 flex flex-col gap-1">
      <div className="text-[11px] text-[var(--color-muted)] tracking-wide">{label}</div>
      <div className={`num text-xl font-semibold ${accent ? "text-[var(--color-red)]" : "text-[var(--color-ink)]"}`}>{value}</div>
      {sub ? <div className="text-[10.5px] text-[var(--color-muted-2)]">{sub}</div> : null}
    </div>
  );
}
