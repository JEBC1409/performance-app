import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

const KEY = "performance_sections_v1";

function readOpen(id: string, fallback: boolean): boolean {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, boolean>;
    return typeof all[id] === "boolean" ? all[id] : fallback;
  } catch {
    return fallback;
  }
}

function writeOpen(id: string, open: boolean): void {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, boolean>;
    localStorage.setItem(KEY, JSON.stringify({ ...all, [id]: open }));
  } catch {
    /* it just won't be remembered */
  }
}

/** A collapsible group of settings: a header row with a one-line summary that
 * opens to show its cards. Remembers what you left open. */
export function Section({ id, title, summary, defaultOpen = false, children }: { id: string; title: string; summary?: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));
  const toggle = () => {
    setOpen((o) => {
      writeOpen(id, !o);
      return !o;
    });
  };

  return (
    <section>
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`section-${id}`}
        className="glass tap-target flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block font-[var(--font-display)] text-[15px]">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-[11.5px] text-[var(--color-muted)]">{summary}</span> : null}
        </span>
        <Icon name="chevron-right" size={18} className={`flex-none text-[var(--color-muted)] transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? (
        <div id={`section-${id}`} className="mt-3 flex flex-col gap-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
