import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { addDays, todayISO } from "@/lib/date";
import { computeInsights, WINDOW_DAYS } from "@/lib/insights";
import { CONFIG_MOOD, sanitizeMood } from "@/lib/mood";
import type { Insight } from "@/lib/insights";

/** Patterns in the last ~90 days of your own data (undefined while loading). */
export function useInsights(): Insight[] | undefined {
  return useLiveQuery(async () => {
    const today = todayISO();
    const since = addDays(today, -WINDOW_DAYS);
    const [sleep, focus, sets, habitDays, moodRow] = await Promise.all([
      db.sleep.where("date").aboveOrEqual(since).toArray(),
      db.focusSessions.where("date").aboveOrEqual(since).toArray(),
      db.sets.where("date").aboveOrEqual(since).toArray(),
      db.habitDays.where("date").aboveOrEqual(since).toArray(),
      db.appConfig.get(CONFIG_MOOD),
    ]);
    return computeInsights(
      {
        sleep: sleep.map((s) => ({ date: s.date, hours: s.hours })),
        focus: focus.map((f) => ({ date: f.date, minutes: f.minutes })),
        trained: [...new Set(sets.map((s) => s.date))],
        habitDays,
        mood: Object.entries(sanitizeMood(moodRow?.value)).map(([date, value]) => ({ date, value })),
      },
      today,
    );
  }, []);
}
