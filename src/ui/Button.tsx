import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "outline";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[var(--color-red)] text-white shadow-[0_0_18px_-4px_rgba(223,37,49,0.65)] hover:brightness-110 active:brightness-90 active:translate-y-px active:scale-[0.99]",
  ghost:
    "text-[var(--color-muted)] hover:text-[var(--color-ink)] active:text-[var(--color-red)]",
  outline:
    "border border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--color-red)] hover:text-[var(--color-red)] active:translate-y-px",
};

export function Button({
  variant = "outline",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`tap-target px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition-all duration-150 disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    />
  );
}
