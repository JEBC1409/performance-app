import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function ChevronGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" className="flex-none" aria-hidden>
      <path d="M2 3.5L5 7l3-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const WIDTH = 220;
const MAX_HEIGHT = 300;

/** Chapter numbers as a badge grid instead of a long native <select> list —
 * echoes the numbered verse badges already used in the reading view, so
 * picking a chapter reads as one more part of the same designed surface. */
export function ChapterPicker({ value, count, onChange }: { value: number; count: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const fitsBelow = rect.bottom + 8 + MAX_HEIGHT <= window.innerHeight;
        setPos({
          top: fitsBelow ? rect.bottom + 8 : Math.max(12, rect.top - MAX_HEIGHT - 8),
          left: Math.min(rect.left, window.innerWidth - WIDTH - 12),
        });
      }
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] transition-colors hover:border-[var(--color-muted)] ${open ? "border-[var(--color-red)]" : ""}`}
      >
        <span className="num">Capítulo {value}</span>
        <ChevronGlyph />
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: WIDTH, maxHeight: MAX_HEIGHT }}
              className="enter z-50 overflow-y-auto rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-2.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]"
            >
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
                  const isSelected = n === value;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        onChange(n);
                        setOpen(false);
                      }}
                      className={`num flex h-7 items-center justify-center rounded-lg text-[11.5px] transition-colors ${
                        isSelected ? "bg-[var(--color-red)] text-white font-semibold" : "text-[var(--color-ink)] hover:bg-[rgba(255,255,255,0.08)]"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
