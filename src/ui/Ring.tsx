export function Ring({ value, size = 54, label, sub }: { value: number; size?: number; label: string; sub?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const complete = clamped >= 1;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={complete ? "glow-dot" : ""}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line-strong)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-red)"
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 400ms ease-out" }}
        />
      </svg>
      <div className="text-[10px] text-center leading-tight text-[var(--color-muted)] uppercase tracking-wide">{label}</div>
      {sub ? <div className="text-[9.5px] text-[var(--color-muted-2)]">{sub}</div> : null}
    </div>
  );
}
