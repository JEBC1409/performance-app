import { useId, useState } from "react";
import { EmptyState } from "./EmptyState";

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
      <div className="text-[11px] text-[var(--color-muted-2)] num">{point.label}</div>
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
  const uid = useId().replace(/:/g, "");

  if (!points.length) {
    return <EmptyState compact icon="chart" title="Todavía no hay datos" hint="Aparecerán aquí en cuanto registres el primero." />;
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

  const slotW = Math.min(barW * 0.42, 6.5);
  const activeH = Math.max(1.5, (activePoint.value / max) * plotH);
  // The value bubble floats above the active bar (percent coordinates, so it
  // tracks the stretched SVG); clamped so it never spills out of the chart.
  const bubbleLeft = Math.min(88, Math.max(12, active * barW + barW / 2));
  const bubbleTop = ((baseline - activeH) / height) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="num text-[15px] font-bold text-[var(--color-ink)]">
          {activePoint.value}
          {unit ? <span className="ml-1 text-[11px] font-medium text-[var(--color-muted)]">{unit}</span> : null}
        </span>
        <span className="text-[10.5px] text-[var(--color-muted-2)] num">{activePoint.label}</span>
      </div>
      <div className="relative mt-1">
        <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none" className="block">
          <defs>
            <linearGradient id={`${uid}-on`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-light-rgb))" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" />
            </linearGradient>
            <linearGradient id={`${uid}-soft`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb) / 0.55)" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb) / 0.2)" />
            </linearGradient>
          </defs>
          <line x1="0" y1={baseline} x2="100" y2={baseline} stroke="var(--color-line)" strokeWidth="0.5" />
          {goalLine ? (
            <line
              x1="0"
              y1={baseline - (goalLine / max) * plotH}
              x2="100"
              y2={baseline - (goalLine / max) * plotH}
              stroke="var(--color-muted)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {points.map((p, i) => {
            const h = Math.max(1.5, (p.value / max) * plotH);
            const x = i * barW + (barW - slotW) / 2;
            const isActive = i === active;
            const fill = isActive ? `url(#${uid}-on)` : p.highlight ? `url(#${uid}-soft)` : "var(--color-line-strong)";
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)} style={{ cursor: "pointer" }}>
                {/* A slot-wide invisible target so thin bars are easy to hit. */}
                <rect x={i * barW} y={0} width={barW} height={height} fill="transparent" />
                <rect
                  x={x}
                  y={baseline - h}
                  width={slotW}
                  height={h}
                  rx={Math.min(2, slotW / 2)}
                  fill={fill}
                  className="bar-grow"
                  style={{ animationDelay: `${Math.min(i * 18, 360)}ms`, transformOrigin: `${x + slotW / 2}px ${baseline}px`, transition: "fill 150ms ease" }}
                />
              </g>
            );
          })}
        </svg>
        <div
          aria-hidden
          className="glass pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg px-2 py-0.5 text-[10.5px] font-semibold num text-[var(--color-ink)]"
          style={{ position: "absolute", left: `${bubbleLeft}%`, top: `max(22px, calc(${bubbleTop}% - 4px))`, transition: "left 160ms ease, top 160ms ease" }}
        >
          {activePoint.value}
        </div>
        {goalLine ? (
          <span
            className="pointer-events-none absolute right-0 -translate-y-full text-[9.5px] text-[var(--color-muted)]"
            style={{ top: `${((baseline - (goalLine / max) * plotH) / height) * 100}%` }}
          >
            meta {goalLine}
          </span>
        ) : null}
      </div>
      <div className="flex mt-1">
        {points.map((p, i) => {
          const showLabel = showAllLabels || i === active || p.highlight || i % 5 === 0 || i === points.length - 1;
          return (
            <button
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(i)}
              className={`text-center text-[10.5px] num transition-colors ${i === active ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-muted-2)]"}`}
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
