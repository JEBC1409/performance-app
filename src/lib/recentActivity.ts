import { db } from "@/db/db";
import type { FocusSessionRecord, HabitDayRecord, SetRecord, SleepRecord, WeightRecord } from "@/db/db";
import type { Table } from "dexie";
import { distinctDates, firstByIndex } from "@/db/safeQuery";
import { addDays } from "./date";
import { WINDOW_DAYS } from "./insights";

/** One read of "what happened lately" that scores, insights, rings, the cycle and
 * the deload card all draw from, instead of each re-reading four or five tables.
 *
 * It comes in two halves split at today, because that is how the data changes:
 *   - HISTORY: everything strictly before today. Logging today never touches it, so
 *     it is read once and left alone (Dexie only re-runs it when the past changes).
 *   - TODAY: everything from today on. Tiny, so re-reading it on each tap is cheap.
 * `combineActivity` puts them back together; every number derived from the pair is
 * exactly what the old per-screen queries produced. */

/** How far back the shared window reaches: the widest consumer (Descubrimientos). */
export const RECENT_DAYS = WINDOW_DAYS;

export interface HistoryActivity {
  today: string;
  /** First day of the window (today - RECENT_DAYS). */
  since: string;
  /** Rows with since <= date < today, in index (date, then id) order. */
  sets: SetRecord[];
  habitDays: HabitDayRecord[];
  weights: WeightRecord[];
  sleep: SleepRecord[];
  focus: FocusSessionRecord[];
  /** Distinct dates with a set, the whole past, sorted. */
  setDates: string[];
  /** Distinct (date, day) workouts, the whole past. */
  sessions: number;
  /** Distinct calendar days with any qualifying activity, the whole past. */
  activeDays: number;
  /** The newest weight logged before today (any age). */
  lastWeight: WeightRecord | undefined;
}

export interface TodayActivity {
  today: string;
  /** Rows with date >= today. */
  sets: SetRecord[];
  habitDays: HabitDayRecord[];
  weights: WeightRecord[];
  sleep: SleepRecord[];
  focus: FocusSessionRecord[];
}

export interface RecentActivity {
  today: string;
  since: string;
  /** Rows with date >= since, oldest first. */
  sets: SetRecord[];
  habitDays: HabitDayRecord[];
  weights: WeightRecord[];
  sleep: SleepRecord[];
  focus: FocusSessionRecord[];
  setDates: string[];
  sessions: number;
  activeDays: number;
  lastWeight: WeightRecord | undefined;
}

/** Runs `read` as ONE read transaction over the tables it touches (one round trip
 * instead of one per table); if the browser objects, runs it plainly as before. */
async function inOneTransaction<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await db.transaction("r", [db.sets, db.habitDays, db.weights, db.sleep, db.focusSessions], read);
  } catch {
    return read();
  }
}

export const sessionKey = (r: { date: string; day: string }) => `${r.date}__${r.day}`;

/** Days with a habit marked count as active; an empty habit row doesn't. */
const hasHabits = (h: HabitDayRecord) => (h.done?.length ?? 0) > 0;

function distinctSorted(rows: { date: string }[]): string[] {
  const out: string[] = [];
  for (const r of rows) if (out[out.length - 1] !== r.date) out.push(r.date);
  return out;
}

export function loadHistory(today: string): Promise<HistoryActivity> {
  const since = addDays(today, -RECENT_DAYS);
  // "Before today" is written `<= yesterday` on purpose: Dexie treats the open end of
  // `below(today)` as closed when deciding which writes should re-run a live query, so
  // logging anything dated today would re-read the whole past. (Dates are always
  // YYYY-MM-DD, so `< today` and `<= yesterday` select the same rows.)
  const yesterday = addDays(today, -1);
  return inOneTransaction(async () => {
    const [allSets, weightDates, sleepDates, focusDates, allHabits, weights, sleep, focus] = await Promise.all([
      db.sets.where("date").belowOrEqual(yesterday).toArray(),
      distinctDates(db.weights.where("date").belowOrEqual(yesterday)),
      distinctDates(db.sleep.where("date").belowOrEqual(yesterday)),
      distinctDates(db.focusSessions.where("date").belowOrEqual(yesterday)),
      db.habitDays.where("date").belowOrEqual(yesterday).toArray(),
      db.weights.where("date").between(since, yesterday, true, true).toArray(),
      db.sleep.where("date").between(since, yesterday, true, true).toArray(),
      db.focusSessions.where("date").between(since, yesterday, true, true).toArray(),
    ]);

    const setDates = distinctSorted(allSets);
    const active = new Set<string>([...setDates, ...weightDates, ...sleepDates, ...focusDates]);
    for (const h of allHabits) if (hasHabits(h)) active.add(h.date);

    // The newest weight overall: usually inside the window already.
    const lastWeightDate = weightDates[weightDates.length - 1];
    let lastWeight: WeightRecord | undefined;
    if (lastWeightDate !== undefined) {
      const sameDay = lastWeightDate >= since ? weights.filter((w) => w.date === lastWeightDate) : await db.weights.where("date").equals(lastWeightDate).toArray();
      lastWeight = sameDay[sameDay.length - 1];
    }

    return {
      today,
      since,
      sets: allSets.filter((s) => s.date >= since),
      habitDays: allHabits.filter((h) => h.date >= since),
      weights,
      sleep,
      focus,
      setDates,
      sessions: new Set(allSets.map(sessionKey)).size,
      activeDays: active.size,
      lastWeight,
    };
  });
}

export function loadToday(today: string): Promise<TodayActivity> {
  return inOneTransaction(async () => {
    const [sets, habitDays, weights, sleep, focus] = await Promise.all([
      db.sets.where("date").aboveOrEqual(today).toArray(),
      db.habitDays.where("date").aboveOrEqual(today).toArray(),
      db.weights.where("date").aboveOrEqual(today).toArray(),
      db.sleep.where("date").aboveOrEqual(today).toArray(),
      db.focusSessions.where("date").aboveOrEqual(today).toArray(),
    ]);
    return { today, sets, habitDays, weights, sleep, focus };
  });
}

/** Distinct active days among rows (the "from today" half of the lifetime count). */
export function countActiveDays(t: Pick<TodayActivity, "sets" | "habitDays" | "weights" | "sleep" | "focus">): number {
  const active = new Set<string>();
  for (const list of [t.sets, t.weights, t.sleep, t.focus]) for (const r of list) active.add(r.date);
  for (const h of t.habitDays) if (hasHabits(h)) active.add(h.date);
  return active.size;
}

export function combineActivity(h: HistoryActivity, t: TodayActivity): RecentActivity {
  const todaysDates = distinctSorted(t.sets);
  return {
    today: h.today,
    since: h.since,
    sets: [...h.sets, ...t.sets],
    habitDays: [...h.habitDays, ...t.habitDays],
    weights: [...h.weights, ...t.weights],
    sleep: [...h.sleep, ...t.sleep],
    focus: [...h.focus, ...t.focus],
    setDates: [...h.setDates, ...todaysDates],
    sessions: h.sessions + new Set(t.sets.map(sessionKey)).size,
    activeDays: h.activeDays + countActiveDays(t),
    lastWeight: t.weights[t.weights.length - 1] ?? h.lastWeight,
  };
}

/** The earliest row of each table that sets the journey's start. */
export interface FirstDates {
  sets?: string;
  weights?: WeightRecord;
  habitDays?: string;
}

/** The earliest rows, re-reading as little as possible. With a previous answer in
 * hand, only the range up to the earliest date known is read (plain `toArray`, no
 * special cursor) — so Dexie re-runs this only when something is logged at or before
 * it (a backfill, or the first row deleted), not on every new set. */
export function loadFirstDates(prev: FirstDates | undefined): Promise<FirstDates> {
  return inOneTransaction(async () => {
    const [firstSet, firstWeight, firstHabit] = await Promise.all([
      earliest<SetRecord>(db.sets, prev?.sets),
      earliest<WeightRecord>(db.weights, prev?.weights?.date),
      earliest<HabitDayRecord>(db.habitDays, prev?.habitDays),
    ]);
    return { sets: firstSet?.date, weights: firstWeight, habitDays: firstHabit?.date };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function earliest<T extends { date: string }>(table: Table<any, any, any>, bound: string | undefined): Promise<T | undefined> {
  if (bound !== undefined) {
    const rows = (await table.where("date").belowOrEqual(bound).toArray()) as T[];
    if (rows.length) return rows[0];
  }
  return firstByIndex<T>(table, "date");
}
