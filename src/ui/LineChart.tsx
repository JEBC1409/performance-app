export interface LinePoint {
  label: string;
  value: number;
}

export function LineChart({
  points,
  height = 150,
  goalPerStep,
  lastValueLabel,
}: {
  points: LinePoint[];
  height?: number;
  goalPerStep?: number;
  lastValueLabel?: string;
}) {
  if (points.length < 2) {
    return <div className="text-center py-8 text-[13px] text-[var(--color-muted)]">Agregá al menos dos registros para ver la tendencia.</div>;
  }
  const W = 300;
  const pad = 8;
  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / (max - min)) * (height - pad * 2);
  const linePts = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const areaPts = `${linePts} ${x(points.length - 1)},${height - pad} ${x(0)},${height - pad}`;

  let goalLinePts = "";
  if (goalPerStep) {
    const first = points[0].value;
    goalLinePts = points.map((_, i) => `${x(i)},${y(first + goalPerStep * i)}`).join(" ");
  }

  const last = points[points.length - 1];
  const dash = W + height;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#df2531" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#df2531" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} y1={height - pad} x2={W - pad} y2={height - pad} stroke="var(--color-line-strong)" strokeWidth="0.6" />
      {goalPerStep ? <polyline points={goalLinePts} fill="none" stroke="var(--color-muted-2)" strokeWidth="0.7" strokeDasharray="3,3" /> : null}
      <polygon points={areaPts} fill="url(#lineFade)" />
      <polyline
        points={linePts}
        fill="none"
        stroke="var(--color-red)"
        strokeWidth="1.6"
        className="draw-line"
        style={{ ["--dash" as string]: dash }}
        strokeDasharray={dash}
      />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 3 : 1.6} fill="var(--color-red)" />
      ))}
      <foreignObject x={Math.max(0, x(points.length - 1) - 60)} y={Math.max(0, y(last.value) - 22)} width="60" height="18">
        <div className="num text-[11px] font-semibold text-right text-[var(--color-ink)]" style={{ fontFamily: "var(--font-body)" }}>
          {lastValueLabel ?? last.value}
        </div>
      </foreignObject>
    </svg>
  );
}
