/** "▲ 0.6 kg" — how much something changed, coloured by whether that's good
 * (`good` says which direction is the win; "neutral" never judges). A change
 * smaller than `flat` reads "= igual" instead of a meaningless ▲ 0.0. */
export function DeltaChip({
  diff,
  unit = "",
  digits = 1,
  good = "up",
  flat = 0.05,
  label,
}: {
  diff: number | null;
  unit?: string;
  digits?: number;
  good?: "up" | "down" | "neutral";
  flat?: number;
  label?: string;
}) {
  if (diff == null) return null;
  if (Math.abs(diff) < flat) {
    return (
      <span className="num inline-flex items-baseline gap-1.5 text-[12px] text-[var(--color-muted)]">
        = igual
        {label ? <span className="text-[var(--color-muted-2)]">{label}</span> : null}
      </span>
    );
  }
  const up = diff > 0;
  const color = good === "neutral" ? "var(--color-muted)" : (up ? good === "up" : good === "down") ? "var(--color-good)" : "var(--color-warn)";
  return (
    <span className="num inline-flex items-baseline gap-1.5 text-[12px]">
      <span className="font-semibold" style={{ color }}>
        {up ? "▲" : "▼"} {Math.abs(diff).toFixed(digits)}
        {unit ? ` ${unit}` : ""}
      </span>
      {label ? <span className="text-[var(--color-muted-2)]">{label}</span> : null}
    </span>
  );
}
