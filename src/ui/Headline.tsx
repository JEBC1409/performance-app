import type { ReactNode } from "react";

/** The number a chart is about, big, with its change next to it — so the figure
 * is the first thing you read and the chart explains it, not the other way round. */
export function Headline({ value, unit, caption, deltas }: { value: ReactNode; unit?: string; caption?: ReactNode; deltas?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="num font-[var(--font-display)] text-[length:var(--fs-hero)] font-light leading-none tracking-tight text-[var(--color-ink)]">{value}</span>
          {unit ? <span className="text-[14px] text-[var(--color-muted)]">{unit}</span> : null}
        </div>
        {caption ? <div className="mt-1.5 text-[12px] text-[var(--color-muted-2)]">{caption}</div> : null}
      </div>
      {deltas ? <div className="flex flex-col items-end gap-1">{deltas}</div> : null}
    </div>
  );
}
