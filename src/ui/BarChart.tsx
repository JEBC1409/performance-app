import { useState } from "react";

export interface BarPoint {
  label: string;
  value: number;
  highlight?: boolean;
}

/** A single point isn't a comparison — it's a fact. A one-bar "chart" reads as
 * a stray red rectangle with nothing to compare it to, so under two points we
 * show a stat tile instead (the dataviz-correct call, not just a style fix). */
function StatTile({ point, unit }: { point: BarPoint; unit?: string }) {
  return (
    <div className="flex h-full flex-col justify-center gap-1 py-2">
      <div className="num text-[26px] font-bold leading-none text-[var(--color-ink)]">
        {point.value}
        {unit ? <span className="ml-1 text-[13px] font-medium text-[var(--color-muted)]">{unit}</span> : null}
      </div>
      <div className="text-[10px] text-[var(--color-muted-2)] num">{point.label}</div>
    </div>
  );
}

export function BarChart({
  points,
  height = 140,
  goalLine,
  unit = "",
}: {
  points: BarPoint[];
  height?: number;
  goalLine?: number;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (!points.length) {
    return <div className="text-center py-8 text-[13px] text-[var(--color-muted)]">Todavía no hay datos.</div>;
  }
  if (points.length === 1) {
    return <StatTile point={points[0]} unit={unit} />;
  }

  const max = Math.max(...points.map((p) => p.value), goalLine ?? 0) * 1.12 || 1;
  const baseline = height - 18;
  const plotH = height - 28;
  const barW = 100 / points.length;
  // Default focus is the flagged point (typically "today") rather than
  // always the last one — for a chart that includes points past the
  // present (e.g. the rest of a calendar month), the last point is
  // usually an empty future day, not the one worth landing on.
  const highlightIdx = points.findIndex((p) => p.highlight);
  const active = hover ?? (highlightIdx >= 0 ? highlightIdx : points.length - 1);
  const activePoint = points[active];
  // Past ~15 bars, a label under every single one turns into unreadable
  // noise — thin out to every 5th, always keeping the highlighted/active
  // ones so "today" stays findable.
  const showAllLabels = points.length <= 15;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="num text-[15px] font-bold text-[var(--color-ink)]">
          {activePoint.value}
          {unit ? <span className="ml-1 text-[10px] font-medium text-[var(--color-muted)]">{unit}</span> : null}
        </span>
        <span className="text-[9.5px] text-[var(--color-muted-2)] num">{activePoint.label}</span>
      </div>
      <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none" className="mt-1">
        <line x1="0" y1={baseline} x2="100" y2={baseline} stroke="var(--color-line)" strokeWidth="0.5" />
        {goalLine ? (
          <line
            x1="0"
            y1={baseline - (goalLine / max) * plotH}
            x2="100"
            y2={baseline - (goalLine / max) * plotH}
            stroke="var(--color-muted-2)"
            strokeWidth="0.4"
            strokeDasharray="2,2"
          />
        ) : null}
        {points.map((p, i) => {
          const h = Math.max(1.5, (p.value / max) * plotH);
          const slotW = Math.min(barW * 0.42, 6.5);
          const x = i * barW + (barW - slotW) / 2;
          const isActive = i === active;
          const fill = isActive ? "var(--color-red)" : p.highlight ? "var(--color-red-soft)" : "var(--color-line-strong)";
          return (
            <rect
              key={i}
              x={x}
              y={baseline - h}
              width={slotW}
              height={h}
              rx={Math.min(2, slotW / 2)}
              fill={fill}
              style={{ transition: "height 400ms ease-out, y 400ms ease-out, fill 150ms ease" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      <div className="flex mt-1">
        {points.map((p, i) => {
          const showLabel = showAllLabels || i === active || p.highlight || i % 5 === 0 || i === points.length - 1;
          return (
            <button
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(i)}
              className={`text-center text-[9px] num transition-colors ${i === active ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-muted-2)]"}`}
              style={{ width: `${barW}%` }}
            >
              {showLabel ? p.label : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
