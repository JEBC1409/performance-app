import { useEffect, useState, useSyncExternalStore } from "react";
import { showToast } from "@/ui/Toast";
import { completePhase, getFocusState, remainingSeconds, subscribeFocus } from "@/lib/focusTimer";

export function useFocusTimer() {
  return useSyncExternalStore(subscribeFocus, getFocusState, getFocusState);
}

/** A clock that re-renders once a second while `active`. Its value can be a
 * moment stale right as `active` flips on, so callers clamp what they derive. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
export function fmtClock(sec: number): string {
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}

/** Mounted once at the app root (not inside the Focus screen), so a phase
 * finishing is noticed — and a block logged — even while you're on another
 * tab. Also keeps the browser tab title showing the countdown. */
export function useFocusWatcher(): void {
  useEffect(() => {
    const baseTitle = document.title;
    function tick() {
      const s = getFocusState();
      if (s.status !== "running") {
        document.title = baseTitle;
        return;
      }
      const left = remainingSeconds(s, Date.now());
      if (left > 0) {
        document.title = `${fmtClock(left)} · ${s.phase === "focus" ? s.task : "Descanso"}`;
        return;
      }
      const { finished, task } = completePhase();
      const msg = finished === "focus" ? `Bloque terminado: ${task}. A descansar.` : "Descanso terminado. ¿Otro bloque?";
      showToast(msg);
      if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("Focus", { body: msg, tag: "performance-focus" });
        } catch {
          /* some mobile browsers throw on the constructor */
        }
      }
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
      document.title = baseTitle;
    };
  }, []);
}
