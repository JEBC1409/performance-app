import { useId, useRef, useState } from "react";
import { EmptyState } from "./EmptyState";
import { trendLine } from "@/lib/trend";

export interface LinePoint {
  label: string;
  value: number;
}

export function LineChart({
  points,
  height = 150,
  goalValues,
  lastValueLabel,
  showTrend = true,
  unit = "",
  axis = true,
}: {
  points: LinePoint[];
  height?: number;
  /** An ideal value for each point (same length as `points`), drawn as a dashed line. */
  goalValues?: number[];
  /** Text for the last point's bubble, when its value alone isn't enough ("12h" total). */
  lastValueLabel?: string;
  showTrend?: boolean;
  /** Shown after the axis values ("72.4 kg"). */
  unit?: string;
  /** Highest and lowest value at the left edge, first and last date underneath. */
  axis?: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");

  if (points.length < 2) {
    return <EmptyState compact icon="chart" title="Aún no hay tendencia" hint="Con dos registros o más verás cómo evoluciona." />;
  }
  const W = 300;
  const pad = 8;
  const values = points.map((p) => p.value);
  const trend = showTrend ? trendLine(values) : null;
  let min = Math.min(...values);
  let max = Math.max(...values);
  const lo = min;
  const hi = max;
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / (max - min)) * (height - pad * 2);
  const yClamped = (v: number) => Math.min(height - pad, Math.max(pad, y(v)));
  const linePts = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const areaPts = `${linePts} ${x(points.length - 1)},${height - pad} ${x(0)},${height - pad}`;

  const goalLinePts = goalValues && goalValues.length === points.length ? goalValues.map((v, i) => `${x(i)},${yClamped(v)}`).join(" ") : "";

  const activeIdx = picked ?? points.length - 1;
  const active = points[activeIdx];
  const dash = W + height;
  const pctX = (i: number) => (x(i) / W) * 100;
  const pctY = (v: number) => (y(v) / height) * 100;
  const bubbleText = activeIdx === points.length - 1 && lastValueLabel ? lastValueLabel : String(active.value);

  function pick(clientX: number) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const rel = (clientX - box.left) / box.width; // 0..1
    const i = Math.round(((rel * W - pad) / (W - pad * 2)) * (points.length - 1));
    setPicked(Math.min(points.length - 1, Math.max(0, i)));
  }

  return (
    <div>
      <div
        ref={boxRef}
        className="relative touch-pan-y select-none"
        style={{ height }}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setPicked(null);
        }}
      >
        <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="absolute inset-0 block">
          <defs>
            <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-red)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-red)" stopOpacity="0" />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <line x1={pad} y1={height - pad} x2={W - pad} y2={height - pad} stroke="var(--color-line-strong)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          {goalLinePts ? (
            <polyline points={goalLinePts} fill="none" stroke="var(--color-muted-2)" strokeWidth="1" strokeDasharray="3,3" vectorEffect="non-scaling-stroke" />
          ) : null}
          <polygon points={areaPts} fill={`url(#${uid}-fade)`} />
          {trend ? (
            <line
              x1={x(0)}
              y1={yClamped(trend.intercept)}
              x2={x(points.length - 1)}
              y2={yClamped(trend.intercept + trend.slope * (points.length - 1))}
              stroke="rgb(var(--fg-rgb)/0.55)"
              strokeWidth="1.2"
              strokeDasharray="1.5,4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <polyline
            points={linePts}
            fill="none"
            stroke="var(--color-red)"
            strokeWidth="2"
            className="draw-line"
            filter={`url(#${uid}-glow)`}
            style={{ ["--dash" as string]: dash }}
            strokeDasharray={dash}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          {/* Guide at the active point */}
          <line x1={x(activeIdx)} y1={y(active.value)} x2={x(activeIdx)} y2={height - pad} stroke="var(--color-red-soft)" strokeWidth="1" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Dots are HTML so they stay round however the chart stretches. */}
        {points.map((p, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${pctX(i)}%`,
              top: `${pctY(p.value)}%`,
              width: i === activeIdx ? 11 : 5,
              height: i === activeIdx ? 11 : 5,
              background: i === activeIdx ? "#fff" : "var(--color-red)",
              boxShadow: i === activeIdx ? "0 0 0 3px var(--color-red-soft), 0 0 14px var(--color-red)" : "0 0 6px var(--color-red-soft)",
              transition: "width 140ms ease, height 140ms ease, box-shadow 140ms ease",
            }}
          />
        ))}

        {axis ? (
          <>
            <span aria-hidden className="num pointer-events-none absolute left-0 top-0 rounded px-1 text-[12px] text-[var(--color-muted-2)]" style={{ background: "rgb(var(--bg-rgb) / 0.55)" }}>
              {Math.round(hi * 10) / 10}
              {unit ? " " + unit : ""}
            </span>
            <span aria-hidden className="num pointer-events-none absolute bottom-3 left-0 rounded px-1 text-[12px] text-[var(--color-muted-2)]" style={{ background: "rgb(var(--bg-rgb) / 0.55)" }}>
              {Math.round(lo * 10) / 10}
              {unit ? " " + unit : ""}
            </span>
          </>
        ) : null}

        <div
          role="status"
          className="glass pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg px-2.5 py-1 text-center"
          style={{ position: "absolute", left: `${Math.min(80, Math.max(20, pctX(activeIdx)))}%`, top: `max(46px, calc(${pctY(active.value)}% - 12px))`, transition: "left 140ms ease, top 140ms ease" }}
        >
          <div className="num text-[12px] font-semibold text-[var(--color-ink)]">{bubbleText}</div>
          <div className="num text-[12px] text-[var(--color-muted)]">{active.label}</div>
        </div>
      </div>
      {axis ? (
        <div aria-hidden className="num mt-1 flex justify-between text-[12px] text-[var(--color-muted-2)]">
          <span>{points[0].label}</span>
          <span>{points[points.length - 1].label}</span>
        </div>
      ) : null}
      {trend ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]">
          <span className="inline-block w-5 border-t border-dotted border-[rgb(var(--fg-rgb)/0.6)]" />
          tendencia
          <span className="num text-[var(--color-muted-2)]">
            ({trend.slope >= 0 ? "+" : ""}
            {trend.slope.toFixed(2)} por registro)
          </span>
        </div>
      ) : null}
    </div>
  );
}
