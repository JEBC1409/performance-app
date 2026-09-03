import { useLiveQuery } from "dexie-react-hooks";
import { db, type SetRecord } from "@/db/db";
import type { GymDay } from "@/lib/cycle";

/** Sets logged for a given session — `date` is whatever day the user is
 * actually logging for, not necessarily today, since training days are
 * irregular (A/B/C by session count, not by calendar week). */
export function useSessionSets(day: GymDay, date: string): SetRecord[] {
  const rows = useLiveQuery(() => db.sets.where("date").equals(date).toArray(), [date]);
  return (rows ?? []).filter((r) => r.day === day);
}

export interface LastSession {
  date: string;
  sets: { weight: number | null; reps: number | null; setIndex: number }[];
}

export function useLastSession(exercise: string, excludeDate: string): LastSession | null {
  const rows = useLiveQuery(() => db.sets.where("exercise").equals(exercise).toArray(), [exercise]);
  if (!rows || !rows.length) return null;
  const prior = rows.filter((r) => r.date !== excludeDate);
  if (!prior.length) return null;
  const lastDate = prior.reduce((a, r) => (r.date > a ? r.date : a), prior[0].date);
  const sets = prior
    .filter((r) => r.date === lastDate)
    .sort((a, b) => a.setIndex - b.setIndex)
    .map((r) => ({ weight: r.weight, reps: r.reps, setIndex: r.setIndex }));
  return { date: lastDate, sets };
}
