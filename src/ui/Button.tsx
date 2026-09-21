import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "outline";

const VARIANT: Record<Variant, string> = {
  // Frosted glass, not a flat fill: .btn-primary/.btn-glass (index.css) carry
  // the backdrop-blur, tinted gradient, and hover sheen sweep; the classes
  // here layer the inset highlight/shadow, outer glow, and press feedback.
  primary:
    "btn-primary text-white border border-[rgb(var(--accent-light-rgb)/0.5)] shadow-[0_1px_0_rgb(var(--fg-rgb)/0.35)_inset,0_-6px_10px_-6px_rgba(0,0,0,0.45)_inset,0_10px_28px_-10px_rgb(var(--accent-rgb)/0.8)] hover:shadow-[0_1px_0_rgb(var(--fg-rgb)/0.4)_inset,0_-6px_10px_-6px_rgba(0,0,0,0.45)_inset,0_14px_32px_-10px_rgb(var(--accent-rgb)/0.9)] active:brightness-95 active:translate-y-px active:scale-[0.99]",
  ghost: "glass-flat text-[var(--color-muted)] hover:text-[var(--color-ink)] active:text-[var(--color-red)] rounded-full",
  outline: "glass text-[var(--color-ink)] hover:!border-[rgb(var(--accent-rgb)/0.55)] hover:text-[var(--color-red)]",
};

export function Button({
  variant = "outline",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`tap-target rounded-full px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition-all duration-150 disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    />
  );
}
