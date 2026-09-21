import type { ReactNode } from "react";

export type EmptyIcon = "chart" | "moon" | "scale" | "dumbbell" | "target" | "book" | "check";

const PATHS: Record<EmptyIcon, ReactNode> = {
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  scale: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M8 9a4 4 0 0 1 8 0M12 9l2-2" />
    </>
  ),
  dumbbell: <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 19.5A2.5 2.5 0 0 1 6.5 17H20" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

/** A friendly empty state: a quiet line icon, one sentence on what goes here,
 * and (optionally) the first action to take — instead of a bare "no data". */
export function EmptyState({
  icon = "chart",
  title,
  hint,
  action,
  compact = false,
}: {
  icon?: EmptyIcon;
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "px-4 py-5" : "px-6 py-8"}`}>
      <span className="glass flex h-12 w-12 items-center justify-center rounded-full text-[var(--color-red)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {PATHS[icon]}
        </svg>
      </span>
      <div className="mt-3 font-[var(--font-display)] text-[14px]">{title}</div>
      {hint ? <p className="mt-1 max-w-[260px] text-[12px] leading-snug text-[var(--color-muted)]">{hint}</p> : null}
      {action ? (
        <button onClick={action.onClick} className="glass-accent tap-target mt-4 rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
