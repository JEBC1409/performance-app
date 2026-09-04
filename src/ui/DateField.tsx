import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DIAS_CORTO, MESES, fmtDateFull, fmtDateHuman, pad2, parseISODate, daysInMonth, jsDowToIndex, todayISO } from "@/lib/date";

function CalendarGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 10 10" className="flex-none text-[var(--color-muted)]" aria-hidden>
      <rect x="1" y="1.8" width="8" height="7.2" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M1 4h8" stroke="currentColor" strokeWidth="1" />
      <path d="M3 0.8v2M7 0.8v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function ChevronGlyph({ dir }: { dir: "left" | "right" }) {
  const d = dir === "left" ? "M6.5 2L3 5l3.5 3" : "M3.5 2L7 5l-3.5 3";
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SIZE = {
  md: "rounded-xl px-3 py-2.5 text-[13px] gap-2",
  sm: "rounded-lg px-2 py-1.5 text-[11.5px] gap-1.5",
};

const POPOVER_WIDTH = 248;

/** A fully custom calendar popover — not a native <input type="date"> — so
 * it can actually match the app's dark visual identity. The native control
 * can't be restyled (its calendar popup is drawn by the OS/browser chrome),
 * and portaling to <body> with fixed positioning (rather than an absolute
 * child) keeps it from being clipped by an ancestor .panel-surface, which
 * always sets overflow: hidden to round its own corners. */
export function DateField({
  value,
  onChange,
  min,
  max,
  size = "md",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const selected = parseISODate(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (!open) {
      const d = parseISODate(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const estimatedHeight = 300;
        const fitsBelow = rect.bottom + 8 + estimatedHeight <= window.innerHeight;
        setPos({
          top: fitsBelow ? rect.bottom + 8 : Math.max(12, rect.top - estimatedHeight - 8),
          left: Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 12),
        });
      }
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function pick(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  const firstDow = jsDowToIndex(new Date(viewYear, viewMonth, 1).getDay());
  const total = daysInMonth(viewYear, viewMonth);
  const cells: (string | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: total }, (_, i) => `${viewYear}-${pad2(viewMonth + 1)}-${pad2(i + 1)}`)];
  const today = todayISO();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Elegir fecha"
        className={`flex w-full items-center justify-between border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] transition-colors hover:border-[var(--color-muted)] ${SIZE[size]} ${open ? "border-[var(--color-red)]" : ""} ${className}`}
      >
        <span className="num text-[var(--color-ink)] capitalize truncate">
          {size === "sm" ? fmtDateHuman(value) : fmtDateFull(value)}
        </span>
        <CalendarGlyph />
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
              className="enter z-50 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]"
            >
              <div className="flex items-center justify-between mb-2.5">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Mes anterior"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[rgba(255,255,255,0.06)]"
                >
                  <ChevronGlyph dir="left" />
                </button>
                <span className="text-[11.5px] font-semibold capitalize text-[var(--color-ink)]">
                  {MESES[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  aria-label="Mes siguiente"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[rgba(255,255,255,0.06)]"
                >
                  <ChevronGlyph dir="right" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {DIAS_CORTO.map((d) => (
                  <div key={d} className="flex h-6 items-center justify-center text-[9px] uppercase tracking-wide text-[var(--color-muted-2)]">
                    {d[0]}
                  </div>
                ))}
                {cells.map((iso, i) => {
                  if (!iso) return <div key={`b${i}`} />;
                  const disabled = (!!min && iso < min) || (!!max && iso > max);
                  const isSelected = iso === value;
                  const isToday = iso === today;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(iso)}
                      className={`num flex h-7 w-7 items-center justify-center rounded-full text-[11.5px] transition-colors ${
                        isSelected
                          ? "bg-[var(--color-red)] text-white font-semibold"
                          : disabled
                            ? "text-[var(--color-muted-2)] opacity-30"
                            : isToday
                              ? "border border-[var(--color-red)] text-[var(--color-red)]"
                              : "text-[var(--color-ink)] hover:bg-[rgba(255,255,255,0.08)]"
                      }`}
                    >
                      {Number(iso.slice(8))}
                    </button>
                  );
                })}
              </div>

              {!(!!min && today < min) && !(!!max && today > max) ? (
                <button
                  type="button"
                  onClick={() => pick(today)}
                  className="mt-2.5 w-full rounded-lg border border-[var(--color-line-strong)] py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-muted)] hover:text-[var(--color-red)] hover:border-[var(--color-red)]"
                >
                  Hoy
                </button>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
