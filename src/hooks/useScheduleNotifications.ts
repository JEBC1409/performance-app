import { useEffect, useSyncExternalStore } from "react";
import { showToast } from "@/ui/Toast";
import { checkScheduleReminders, getNotifyPrefs, subscribeNotifyPrefs } from "@/lib/scheduleNotify";
import { subscribeTick } from "@/lib/ticker";

export function useNotifyPrefs() {
  return useSyncExternalStore(subscribeNotifyPrefs, getNotifyPrefs, getNotifyPrefs);
}

/** Mounted at the app root: while the app is running (open tab or installed
 * PWA), sends each of today's schedule reminders on time. Uses the worker
 * ticker so a hidden tab still fires when the minute comes. */
export function useScheduleNotifications(): void {
  const { enabled, lead, scope } = useNotifyPrefs();

  useEffect(() => {
    if (!enabled) return;
    let lastMinute = -1;
    function tick() {
      const now = new Date();
      const minute = now.getHours() * 60 + now.getMinutes();
      if (minute === lastMinute) return;
      lastMinute = minute;
      checkScheduleReminders(now)
        .then((sent) => {
          if (sent.length && document.visibilityState === "visible") showToast(sent[0]);
        })
        .catch((err) => console.error("schedule reminder failed", err));
    }
    tick();
    return subscribeTick(tick);
  }, [enabled, lead, scope]);
}
