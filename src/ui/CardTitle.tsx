import type { ReactNode } from "react";

/** One heading style for every card: readable sentence-case type, with an
 * optional small figure on the right (a count, a unit). Small tracked caps are
 * kept for true metadata, so the accent color isn't spent on every heading. */
export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="card-title">{children}</h2>
      {right != null ? <div className="num text-[11.5px] text-[var(--color-muted)]">{right}</div> : null}
    </div>
  );
}
