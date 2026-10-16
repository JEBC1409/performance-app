import { epley1RM, roundKg } from "./epley";

export interface RecordSet {
  weight: number | null;
  reps: number | null;
}

export interface PersonalRecord {
  /** "1rm" = the set implies a higher estimated max; "reps" = most reps with no load. */
  kind: "1rm" | "reps";
  /** Estimated one-rep max for the set (kg), for "1rm" records. */
  estimate: number | null;
}

/** Whether `set` beats everything logged before it for the same exercise.
 * Loaded sets are compared by estimated one-rep max (so 40 kg × 12 can beat
 * 45 kg × 6, and vice versa); unloaded ones by reps. The first time an
 * exercise is ever logged there's nothing to beat, so that's never a record. */
export function personalRecord(history: RecordSet[], set: RecordSet): PersonalRecord | null {
  const reps = set.reps ?? 0;
  if (reps <= 0) return null;
  const valid = history.filter((h) => (h.reps ?? 0) > 0);
  if (!valid.length) return null;

  if (set.weight != null && set.weight > 0) {
    const prior = valid.filter((h) => h.weight != null && h.weight > 0).map((h) => epley1RM(h.weight as number, h.reps as number));
    if (!prior.length) return null;
    const est = epley1RM(set.weight, reps);
    return est > Math.max(...prior) + 0.001 ? { kind: "1rm", estimate: roundKg(est) } : null;
  }

  const priorReps = valid.filter((h) => !(h.weight != null && h.weight > 0)).map((h) => h.reps as number);
  if (!priorReps.length) return null;
  return reps > Math.max(...priorReps) ? { kind: "reps", estimate: null } : null;
}
