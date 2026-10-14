import { useCallback, useSyncExternalStore } from "react";
import { useNow } from "@/hooks/useFocusTimer";
import { addRest, getRestState, restRemaining, skipRest, startRest, subscribeRest } from "@/lib/restTimer";

export interface RestTimerState {
  running: boolean;
  remaining: number;
  total: number;
}

const ASKED_KEY = "performance_rest_notif_asked_v1";

/** Asks once for permission to notify, so the end of a rest can reach you while
 * the app is in the background. Called from a tap (logging a set). */
function askNotificationsOnce(): void {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "default" || localStorage.getItem(ASKED_KEY)) return;
    localStorage.setItem(ASKED_KEY, "1");
    Notification.requestPermission().catch(() => {});
  } catch {
    /* optional */
  }
}

/** The rest between sets. The state lives in lib/restTimer (an end time, not a
 * countdown), so it's the same wherever it's read and keeps its place while the
 * app is hidden or on another screen. */
export function useRestTimer() {
  const state = useSyncExternalStore(subscribeRest, getRestState, getRestState);
  const now = useNow(state.endAt != null);
  const remaining = restRemaining(state, now);

  const start = useCallback((seconds: number) => {
    askNotificationsOnce();
    startRest(seconds);
  }, []);
  const addTime = useCallback((seconds: number) => addRest(seconds), []);
  const skip = useCallback(() => skipRest(), []);

  return { running: remaining > 0, remaining, total: state.total, start, addTime, skip };
}
