import { useEffect, useState } from "react";

export interface ToastOptions {
  /** A button on the toast (e.g. "Deshacer"). Its toast stays up longer. */
  action?: { label: string; onClick: () => void };
  /** How long it stays, in ms. */
  duration?: number;
}

interface ToastState {
  msg: string;
  opts?: ToastOptions;
  id: number;
}

type Listener = (t: ToastState) => void;
const listeners = new Set<Listener>();
let counter = 0;

export function showToast(msg: string, opts?: ToastOptions): void {
  const t = { msg, opts, id: ++counter };
  listeners.forEach((l) => l(t));
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const listener: Listener = (t) => setToast(t);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.opts?.duration ?? (toast.opts?.action ? 6000 : 1900);
    const t = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(t);
  }, [toast]);

  // The live region stays mounted (so screen readers reliably announce a new
  // message); the visible toast comes and goes inside it.
  return (
    <div role="status" aria-live="polite">
      {toast ? <ToastBubble key={toast.id} toast={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

function ToastBubble({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  const action = toast.opts?.action;
  return (
    <div className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom))] sidebar:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-full bg-[var(--color-ink)] px-4 py-2 text-[12.5px] font-semibold text-black shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] enter">
      <span>{toast.msg}</span>
      {action ? (
        <button
          onClick={() => {
            action.onClick();
            onDone();
          }}
          className="rounded-full bg-[rgb(var(--accent-rgb))] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
