import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Drag down to dismiss (only when the sheet is scrolled to its top, so it
  // never fights normal scrolling).
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [dy, setDy] = useState(0);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sidebar:items-center sidebar:justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        ref={panelRef}
        onTouchStart={(e) => {
          startY.current = (panelRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
        }}
        onTouchMove={(e) => {
          if (startY.current == null) return;
          const d = e.touches[0].clientY - startY.current;
          setDy(d > 0 ? d : 0);
        }}
        onTouchEnd={() => {
          const shouldClose = dy > 110;
          startY.current = null;
          setDy(0);
          if (shouldClose) onClose();
        }}
        style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : { transition: "transform 200ms ease" }}
        className="relative w-full sidebar:max-w-md bg-[var(--color-surface)] border-t sidebar:border border-[var(--color-line-strong)] p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] sidebar:pb-5 max-h-[85vh] overflow-y-auto enter">
        <span aria-hidden className="mx-auto -mt-2 mb-3 block h-1 w-10 rounded-full bg-[rgba(255,255,255,0.18)] sidebar:hidden" />
        <div className="flex items-center justify-between mb-4">
          {title ? <div className="eyebrow">{title}</div> : <span />}
          <button onClick={onClose} className="glass hit w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)]" aria-label="Cerrar">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
