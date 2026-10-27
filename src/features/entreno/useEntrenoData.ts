import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type SetRecord } from "@/db/db";
import { useTodayActivity } from "@/hooks/useRecentActivity";
import { todayISO } from "@/lib/date";
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

/** The newest session of `exercise` on any date other than `excludeDate`.
 *
 * Give it `inMemory` (every set logged before `excludeDate` — Entreno already holds
 * that list, `undefined` while it loads) and, when `excludeDate` is today, the answer
 * is worked out from it plus today's small shared read, without re-reading the
 * exercise's whole history. For any other date — a backfill, where newer sessions
 * count too — or with no `inMemory`, it reads the exercise from the database. */
export function useLastSession(exercise: string, excludeDate: string, inMemory?: { priorSets: SetRecord[] | undefined }): LastSession | null {
  const fromMemory = inMemory !== undefined && excludeDate >= todayISO();
  const todays = useTodayActivity(fromMemory);
  const dbRows = useLiveQuery(async () => (fromMemory ? undefined : await db.sets.where("exercise").equals(exercise).toArray()), [exercise, fromMemory]);
  const priorSets = inMemory?.priorSets;

  const rows = useMemo(() => {
    if (!fromMemory) return dbRows;
    if (!priorSets || !todays) return undefined;
    // Everything before `excludeDate`, plus whatever is dated after it (only possible ahead of today).
    return [...priorSets.filter((r) => r.exercise === exercise), ...todays.sets.filter((r) => r.exercise === exercise && r.date > excludeDate)];
  }, [fromMemory, dbRows, priorSets, todays, exercise, excludeDate]);

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
