import { fmtDateFull, fmtDateHuman } from "@/lib/date";

function CalendarGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 10 10" className="flex-none text-[var(--color-muted)]" aria-hidden>
      <rect x="1" y="1.8" width="8" height="7.2" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M1 4h8" stroke="currentColor" strokeWidth="1" />
      <path d="M3 0.8v2M7 0.8v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** A native <input type="date"> made invisible and overlaid on a styled
 * label showing the app's own date format — keeps the OS date-picker
 * behavior/a11y while matching the app's visual identity instead of the
 * browser's raw locale-formatted text. */
const SIZE = {
  md: "rounded-xl px-3 py-2.5 text-[13px] gap-2",
  sm: "rounded-lg px-2 py-1.5 text-[11.5px] gap-1.5",
};

export function DateField({
  value,
  onChange,
  min,
  max,
  size = "md",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-between border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] ${SIZE[size]} ${className}`}
    >
      <span className="num text-[var(--color-ink)] capitalize truncate">
        {size === "sm" ? fmtDateHuman(value) : fmtDateFull(value)}
      </span>
      <CalendarGlyph />
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value || value)}
        aria-label="Fecha"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}
