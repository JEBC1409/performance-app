import type { SetRecord } from "@/db/db";
import type { Suggestion } from "@/lib/progression";
import type { LastSession } from "./useEntrenoData";

/** What the weight/reps controls open on: what you just logged today for this
 * exercise, else the progression suggestion, else last time's heaviest set.
 * Shared by Gym Mode and the exercise card's own sheet so they seed identically. */
export function seedWeightReps(
  todaySets: SetRecord[],
  suggestion: Suggestion | null,
  last: LastSession | null,
  fallbackReps: number,
): { weight: number | null; reps: number } {
  const prevToday = todaySets[todaySets.length - 1];
  if (prevToday?.weight != null || prevToday?.reps != null) return { weight: prevToday.weight, reps: prevToday.reps ?? fallbackReps };
  if (suggestion) return { weight: suggestion.weight, reps: suggestion.reps };
  const top = last?.sets.reduce<{ weight: number | null; reps: number | null } | null>((m, st) => (m == null || (st.weight ?? 0) > (m.weight ?? 0) ? st : m), null);
  return { weight: top?.weight ?? null, reps: top?.reps ?? fallbackReps };
}
