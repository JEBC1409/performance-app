import { useEffect } from "react";
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sidebar:items-center sidebar:justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full sidebar:max-w-md bg-[var(--color-surface)] border-t sidebar:border border-[var(--color-line-strong)] p-5 max-h-[85vh] overflow-y-auto enter">
        <div className="flex items-center justify-between mb-4">
          {title ? <div className="eyebrow">{title}</div> : <span />}
          <button onClick={onClose} className="w-7 h-7 border border-[var(--color-line-strong)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)]" aria-label="Cerrar">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
