import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";

/** The top of every screen: a small section label, the title, an optional line
 * of context, and an optional control on the right (a date, an "Editar" toggle).
 * One size and spacing everywhere, so moving between screens doesn't jump. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
  gold = false,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  gold?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Eyebrow accent={!gold} gold={gold}>
          {eyebrow}
        </Eyebrow>
        <h1 className="mt-1.5 font-[var(--font-display)] text-[24px] leading-tight tracking-tight">{title}</h1>
        {subtitle ? <div className="mt-1.5 text-[12.5px] leading-snug text-[var(--color-muted)]">{subtitle}</div> : null}
      </div>
      {right ? <div className="flex-none">{right}</div> : null}
    </div>
  );
}
