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
          return (
            <rect
              key={i}
              x={x}
              y={height - 18 - h}
              width={w}
              height={h}
              fill={p.highlight ? "var(--color-red)" : "rgba(223,37,49,0.35)"}
              style={{ transition: "height 400ms ease-out, y 400ms ease-out" }}
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
