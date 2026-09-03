import type { ReactNode } from "react";

type ChipTone = "neutral" | "accent" | "good" | "bad";

const TONE_CLASS: Record<ChipTone, string> = {
  neutral: "text-[var(--color-muted)] border-[var(--color-line-strong)]",
  accent: "text-[var(--color-red)] border-[var(--color-red-soft)]",
  good: "text-[var(--color-good)] border-[var(--color-good-soft)]",
  bad: "text-[var(--color-red)] border-[var(--color-red-softer)]",
};

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: ChipTone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}
