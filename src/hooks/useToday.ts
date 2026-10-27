import { useEffect, useState } from "react";
import { todayISO } from "@/lib/date";

/** Milliseconds from `now` to the next local midnight (+1 s of slack so the clock has surely rolled over). */
export function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

/**
 * Today's date (ISO, local time) that keeps itself current. An installed PWA is
 * often reopened the next morning without a reload, and `todayISO()` alone only
 * re-reads the clock when something happens to re-render — so the app showed
 * "yesterday". This re-reads it when the app comes back to the foreground
 * (visibilitychange / pageshow / focus) and at the next local midnight, and
 * changes state only when the day actually changed.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    let timer: number | undefined;

    const refresh = () => {
      const now = todayISO();
      setToday((prev) => (prev === now ? prev : now));
    };
    // Re-armed from the real clock every time, so a timer that slept in the
    // background (the browser throttles them) never leaves it pointing at a stale midnight.
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        refresh();
        arm();
      }, msUntilNextMidnight());
    };
    const onWake = () => {
      if (document.visibilityState === "hidden") return;
      refresh();
      arm();
    };

    arm();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("pageshow", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("pageshow", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, []);

  return today;
}
