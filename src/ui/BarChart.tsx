export interface BarPoint {
  label: string;
  value: number;
  highlight?: boolean;
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
  if (!points.length) {
    return <div className="text-center py-8 text-[13px] text-[var(--color-muted)]">Todavía no hay datos.</div>;
  }
  const max = Math.max(...points.map((p) => p.value), goalLine ?? 0) * 1.15 || 1;
  const barW = 100 / points.length;
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <defs>
          <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4d58" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#df2531" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="barFillDim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#df2531" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#df2531" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <line x1="0" y1={height - 18} x2="100" y2={height - 18} stroke="var(--color-line-strong)" strokeWidth="0.4" />
        {goalLine ? (
          <line
            x1="0"
            y1={height - 18 - (goalLine / max) * (height - 26)}
            x2="100"
            y2={height - 18 - (goalLine / max) * (height - 26)}
            stroke="var(--color-muted-2)"
            strokeWidth="0.4"
            strokeDasharray="2,2"
          />
        ) : null}
        {points.map((p, i) => {
          const h = (p.value / max) * (height - 26);
          const x = i * barW + barW * 0.22;
          const w = barW * 0.56;
          const r = Math.min(1.6, w / 2, h / 2);
          return (
            <rect
              key={i}
              x={x}
              y={height - 18 - h}
              width={w}
              height={h}
              rx={r}
              fill={p.highlight ? "url(#barFill)" : "url(#barFillDim)"}
              style={{ transition: "height 400ms ease-out, y 400ms ease-out", filter: p.highlight ? "drop-shadow(0 0 4px rgba(223,37,49,0.55))" : undefined }}
            />
          );
        })}
      </svg>
      <div className="flex mt-1">
        {points.map((p, i) => (
          <div key={i} className="text-center text-[9.5px] text-[var(--color-muted-2)] num" style={{ width: `${barW}%` }}>
            {p.label}
          </div>
        ))}
      </div>
      {unit ? <div className="text-[10px] text-[var(--color-muted-2)] mt-1">{unit}</div> : null}
    </div>
  );
}
