import { useEffect, useState } from "react";

type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

export function showToast(msg: string): void {
  listeners.forEach((l) => l(msg));
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const listener: Listener = (m) => setMsg(m);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 1900);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;

  return (
    <div className="fixed bottom-20 sidebar:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[var(--color-ink)] text-black px-4 py-2 text-[12.5px] font-semibold enter">
      {msg}
    </div>
  );
}
