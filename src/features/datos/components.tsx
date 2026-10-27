import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/ui";

/** A short row of mutually exclusive options (a period, a measurement). Every
 * option is a 44px target and the chosen one says so with aria-pressed, not
 * just colour. */
export function Segmented<T extends string | number>({
  items,
  value,
  onChange,
  label,
  className = "",
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`flex max-w-md gap-1.5 ${className}`}>
      {items.map((it) => (
        <Button key={String(it.key)} variant="secondary" selected={it.key === value} onClick={() => onChange(it.key)} className={`flex-1 !px-3 ${it.key === value ? "text-[var(--color-accent-text)]" : ""}`}>
          {it.label}
        </Button>
      ))}
    </div>
  );
}

export interface EntryRow {
  key: string | number;
  date: string;
  value: ReactNode;
  extra?: ReactNode;
}

/** The log under a chart: newest first, only the latest few until you ask for
 * the rest, so a year of entries never pushes the next card away. */
export function EntryList({ rows, initial = 5, noun = "registros" }: { rows: EntryRow[]; initial?: number; noun?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, initial);
  const hidden = rows.length - shown.length;
  return (
    <div>
      <ul className="divide-y divide-[var(--color-line)]">
        {shown.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="num text-[var(--color-muted)]">{r.date}</span>
            <span className="num flex items-center gap-2 font-semibold">
              {r.value}
              {r.extra}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 || (all && rows.length > initial) ? (
        <div className="border-t border-[var(--color-line)] p-2">
          <Button variant="ghost" className="w-full" aria-expanded={all} aria-pressed={undefined} onClick={() => setAll((v) => !v)}>
            {all ? "Ver menos" : `Ver ${hidden} ${noun} más`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Inline problem under a form field. */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-[var(--color-accent-text)]">
      {children}
    </p>
  );
}
