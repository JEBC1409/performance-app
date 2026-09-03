import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "outline";

const VARIANT: Record<Variant, string> = {
  primary: "bg-[var(--color-red)] text-black hover:brightness-110",
  ghost: "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
  outline: "border border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--color-red)]",
};

export function Button({ variant = "outline", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`px-4 py-2.5 text-[12.5px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    />
  );
}
