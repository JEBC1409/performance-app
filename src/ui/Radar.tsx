export interface RadarAxis {
  label: string;
  value: number; // 0..1
}

export function Radar({ axes, size = 240 }: { axes: RadarAxis[]; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 34;
  const n = axes.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, frac: number) => {
    const a = angle(i);
    return [c + Math.cos(a) * r * frac, c + Math.sin(a) * r * frac] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = axes.map((ax, i) => pt(i, Math.max(0.04, Math.min(1, ax.value))));
  const dataPoly = dataPts.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((f) => {
          const ringPts = axes.map((_, i) => pt(i, f).join(",")).join(" ");
          return <polygon key={f} points={ringPts} fill="none" stroke="var(--color-line-strong)" strokeWidth="0.6" />;
        })}
        {axes.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--color-line)" strokeWidth="0.6" />;
        })}
        <polygon points={dataPoly} fill="rgba(223,37,49,0.28)" stroke="var(--color-red)" strokeWidth="1.4" />
        {dataPts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.4" fill="var(--color-red)" />
        ))}
      </svg>
      {axes.map((ax, i) => {
        const [lx, ly] = pt(i, 1.24);
        return (
          <span
            key={ax.label}
            className="absolute text-[9.5px] uppercase tracking-wide text-[var(--color-muted)] whitespace-nowrap"
            style={{ left: lx, top: ly, transform: "translate(-50%, -50%)" }}
          >
            {ax.label}
          </span>
        );
      })}
    </div>
  );
}
