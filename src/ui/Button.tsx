import type { ButtonHTMLAttributes } from "react";

/** Three roles: `primary` (solid accent fill), `secondary` (surface + border) and `ghost`
 * (no box until hovered). `outline` is the old name of `secondary` and still works. */
type Variant = "primary" | "secondary" | "ghost" | "outline";

const VARIANT: Record<Variant, string> = {
  // The looks live in index.css (.btn-primary / .glass / .glass-flat); here only the shape.
  primary: "btn-primary",
  secondary: "glass text-[var(--color-ink)]",
  outline: "glass text-[var(--color-ink)]",
  ghost: "glass-flat text-[var(--color-muted)] hover:text-[var(--color-ink)]",
};

/** `selected` marks a toggle/segment as chosen (sets aria-pressed; the accent ~16% fill comes
 * from index.css). Leave it undefined for a plain action button. */
export function Button({
  variant = "secondary",
  selected,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; selected?: boolean }) {
  return (
    <button
      aria-pressed={selected}
      {...rest}
      className={`btn inline-flex items-center justify-center gap-2 rounded-full px-5 text-[14px] disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    />
  );
}
