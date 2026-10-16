import { parseRepRange, suggestNext } from "./progression";
import type { Suggestion } from "./progression";

export interface DatedSet {
  date: string;
  weight: number | null;
  reps: number | null;
}

/** If the last session of an exercise (before `before`) already reached the top
 * of the rep range on every working set, the double-progression rule says it's
 * time to add weight: returns that suggestion, else null. `startDate` is when
 * the starting weight was set: sessions before it are older than what the
 * routine says you're at, so they don't count. */
export function readyToIncrease(repsLabel: string, sets: DatedSet[], before: string, startDate?: string): Suggestion | null {
  let lastDate: string | null = null;
  for (const s of sets) if (s.date < before && (lastDate == null || s.date > lastDate)) lastDate = s.date;
  if (lastDate == null) return null;
  if (startDate && lastDate < startDate) return null;
  const last = sets.filter((s) => s.date === lastDate);
  const s = suggestNext(parseRepRange(repsLabel), last);
  return s?.kind === "increase" ? s : null;
}
