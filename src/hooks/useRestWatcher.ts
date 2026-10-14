import { useEffect, useSyncExternalStore } from "react";
import { completeRestIfDue, getRestState, subscribeRest } from "@/lib/restTimer";
import { playChime } from "@/lib/focusSound";
import { sendNotification } from "@/lib/scheduleNotify";
import { subscribeTick } from "@/lib/ticker";
import { showToast } from "@/ui/Toast";

// Past this, the page was asleep when the rest ended: the moment has passed, so
// don't ring a chime now — just say so.
const FRESH_SEC = 4;
const MESSAGE = "Descanso terminado. A la siguiente serie.";

/** Mounted once at the app root, so the end of a rest is noticed whichever
 * screen you're on — and, where the browser keeps the page alive, while it's
 * in the background (the beat comes from a worker, which isn't throttled like
 * page timers). Vibrates, rings and notifies; if the phone froze the page it
 * catches up the moment you're back. */
export function useRestWatcher(): void {
  const endAt = useSyncExternalStore(subscribeRest, getRestState, getRestState).endAt;

  useEffect(() => {
    if (endAt == null) return;
    const check = () => {
      const done = completeRestIfDue();
      if (!done) return;
      const fresh = done.lateBySec <= FRESH_SEC;
      if (fresh) {
        if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
        void playChime("break");
      }
      if (document.visibilityState !== "visible") void sendNotification("Descanso terminado", "A la siguiente serie.", { tag: "performance-rest" });
      else showToast(MESSAGE);
    };
    check();
    const unsub = subscribeTick(check);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
    };
  }, [endAt]);
}
