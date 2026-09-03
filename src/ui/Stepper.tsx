export function Stepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix = "",
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const clamp = (v: number) => {
    let out = v;
    if (min !== undefined) out = Math.max(min, out);
    if (max !== undefined) out = Math.min(max, out);
    return out;
  };
  return (
    <div className="inline-flex items-stretch border border-[var(--color-line-strong)]">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        className="w-8 flex items-center justify-center text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
        aria-label="Disminuir"
      >
        −
      </button>
      <div className="num min-w-14 flex items-center justify-center text-sm border-x border-[var(--color-line-strong)] px-2">
        {value}
        {suffix}
      </div>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        className="w-8 flex items-center justify-center text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  );
}
