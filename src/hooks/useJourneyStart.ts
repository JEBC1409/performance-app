import { todayISO } from "@/lib/date";
import { useFirstDates } from "./useRecentActivity";

/** Earliest date across every table that carries one — the day this journey
 * actually started, not just when the account was created. Falls back to
 * today until there's any data at all. */
export function useJourneyStart(): string {
  const first = useFirstDates();
  const dates = [first?.sets, first?.weights?.date, first?.habitDays].filter((d): d is string => !!d);
  const earliest = dates.length ? dates.reduce((a, b) => (b < a ? b : a)) : null;
  return earliest ?? todayISO();
}
