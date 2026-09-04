import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { todayISO } from "@/lib/date";

/** Earliest date across every table that carries one — the day this journey
 * actually started, not just when the account was created. Falls back to
 * today until there's any data at all. */
export function useJourneyStart(): string {
  const earliest = useLiveQuery(async () => {
    const [firstSet, firstWeight, firstHabit] = await Promise.all([
      db.sets.orderBy("date").first(),
      db.weights.orderBy("date").first(),
      db.habitDays.orderBy("date").first(),
    ]);
    const dates = [firstSet?.date, firstWeight?.date, firstHabit?.date].filter((d): d is string => !!d);
    if (!dates.length) return null;
    return dates.reduce((a, b) => (b < a ? b : a));
  }, []);
  return earliest ?? todayISO();
}
