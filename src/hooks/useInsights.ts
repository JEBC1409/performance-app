import { useMemo } from "react";
import { computeInsights } from "@/lib/insights";
import { sanitizeMood } from "@/lib/mood";
import type { Insight } from "@/lib/insights";
import { useRecentActivity, useSharedConfig } from "./useRecentActivity";

/** Patterns in the last ~90 days of your own data (undefined while loading). Works
 * from the shared recent-activity read instead of re-reading five tables on every write. */
export function useInsights(): Insight[] | undefined {
  const recent = useRecentActivity();
  const config = useSharedConfig();
  return useMemo(() => {
    if (!recent || !config) return undefined;
    return computeInsights(
      {
        sleep: recent.sleep.map((s) => ({ date: s.date, hours: s.hours })),
        focus: recent.focus.map((f) => ({ date: f.date, minutes: f.minutes })),
        trained: [...new Set(recent.sets.map((s) => s.date))],
        habitDays: recent.habitDays,
        mood: Object.entries(sanitizeMood(config.mood)).map(([date, value]) => ({ date, value })),
      },
      recent.today,
    );
  }, [recent, config]);
}
