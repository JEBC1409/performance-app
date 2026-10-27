import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BibleBookMeta } from "@/data/bible/books";

function ChevronGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" className="flex-none" aria-hidden>
      <path d="M2 3.5L5 7l3-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const WIDTH = 240;
const MAX_HEIGHT = 320;

/** Custom-styled replacement for the native <select> book picker — the OS's
 * own dropdown chrome (default font, flat list, no grouping visuals) can't
 * be restyled, so this portals a real dark panel matching the app instead,
 * keeping the Antiguo/Nuevo Testamento grouping as sticky section labels. */
export function BookPicker({ value, onChange, books }: { value: string; onChange: (abbrev: string) => void; books: BibleBookMeta[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const current = books.find((b) => b.abbrev === value);

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

  // Open on the book you're in, not at Génesis.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const el = panel?.querySelector<HTMLElement>('[aria-current="true"]');
    if (panel && el) panel.scrollTop = el.offsetTop - panel.clientHeight / 2 + el.offsetHeight / 2;
  }, [open]);

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
        aria-label={`Libro: ${current?.name ?? value}`}
        className={`tap-target flex w-full items-center justify-between gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--color-ink)] ${open ? "glass-sel" : "glass"}`}
      >
        <span className="truncate">{current?.name ?? value}</span>
        <ChevronGlyph />
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: WIDTH, maxHeight: MAX_HEIGHT }}
              className="enter surface-2 z-50 flex flex-col overflow-y-auto rounded-2xl py-1.5"
            >
              {(["AT", "NT"] as const).map((testament) => (
                <div key={testament}>
                  <div className="eyebrow sticky top-0 z-10 bg-[rgb(var(--raised-rgb))] px-3.5 pb-1.5 pt-2.5">
                    {testament === "AT" ? "Antiguo Testamento" : "Nuevo Testamento"}
                  </div>
                  {books
                    .filter((b) => b.testament === testament)
                    .map((b) => {
                      const isSelected = b.abbrev === value;
                      return (
                        <button
                          key={b.abbrev}
                          type="button"
                          onClick={() => {
                            onChange(b.abbrev);
                            setOpen(false);
                          }}
                          aria-current={isSelected ? "true" : undefined}
                          className={`flex min-h-[var(--control-h)] w-full items-center px-3.5 text-left text-sm transition-colors ${
                            isSelected ? "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--color-accent-text)] font-semibold" : "text-[var(--color-ink)] hover:bg-[rgb(var(--fg-rgb)/0.06)]"
                          }`}
                        >
                          {b.name}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
