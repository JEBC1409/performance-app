import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { showToast } from "@/ui/Toast";
import { completeIfDue, getFocusState, remainingSeconds, subscribeFocus } from "@/lib/focusTimer";
import { initAudioUnlock, playChime } from "@/lib/focusSound";
import { subscribeTick } from "@/lib/ticker";
import { celebrate } from "@/lib/feedback";

export function useFocusTimer() {
  return useSyncExternalStore(subscribeFocus, getFocusState, getFocusState);
}

/** A clock that re-renders once a second while `active`. Its value can be a
 * moment stale right as `active` flips on, so callers clamp what they derive. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    return subscribeTick(() => setNow(Date.now()));
  }, [active]);
  return now;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
export function fmtClock(sec: number): string {
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}

function notify(msg: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification("Focus", { body: msg, tag: "performance-focus", requireInteraction: false });
  } catch {
    /* some mobile browsers throw on the constructor */
  }
}

/** Mounted once at the app root (not inside the Focus screen), so a phase
 * finishing is noticed — and a block logged — even while you're on another
 * tab or the window is hidden. Rings the chime, and keeps the browser tab
 * title showing the countdown. */
export function useFocusWatcher(): void {
  const status = useFocusTimer().status;
  const baseTitle = useRef(typeof document !== "undefined" ? document.title : "");

  useEffect(() => initAudioUnlock(), []);

  useEffect(() => {
    const base = baseTitle.current;
    if (status === "idle") {
      document.title = base;
      return;
    }
    function tick() {
      const s = getFocusState();
      if (s.status === "idle") {
        document.title = base;
        return;
      }
      const label = s.phase === "focus" ? s.task : "Descanso";
      if (s.status === "paused") {
        document.title = `⏸ ${fmtClock(s.remainingSec)} · ${label}`;
        return;
      }
      const left = remainingSeconds(s, Date.now());
      if (left > 0) {
        document.title = `${fmtClock(left)} · ${label}`;
        return;
      }
      const done = completeIfDue();
      if (!done) return;
      const msg = done.finished === "focus" ? `Bloque terminado: ${done.task}. A descansar.` : "Descanso terminado. ¿Otro bloque?";
      showToast(msg);
      if (done.late) return;
      void playChime(done.finished);
      if (done.finished === "focus" && document.visibilityState === "visible") celebrate();
      if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
      notify(msg);
    }
    tick();
    const unsub = subscribeTick(tick);
    return () => {
      unsub();
      document.title = base;
    };
  }, [status]);
}
