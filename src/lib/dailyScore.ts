import { db, type HabitDayRecord } from "@/db/db";
import { distinctDates } from "@/db/safeQuery";
import { addDays, todayISO } from "./date";

export const STREAK_WINDOW_DAYS = 28;

export interface DayScore {
  date: string;
  points: number;
  trained: boolean;
  habitsDone: number;
}

function habitsDoneFor(day: HabitDayRecord | undefined): number {
  return day?.done.length ?? 0;
}

export interface ScoreRows {
  sets: { date: string }[];
  habitDays: HabitDayRecord[];
  weights: { date: string }[];
  sleeps: { date: string }[];
  focus: { date: string }[];
}

/** The scoring math on rows already in memory (any superset of the window is fine —
 * only the `days` ending `today` are looked at). One entry per day, oldest first, even
 * for days with nothing logged (points: 0) — the streak/rank math below needs the
 * full, gapless run to walk backward correctly. */
export function buildDailyScores(rows: ScoreRows, days: number = STREAK_WINDOW_DAYS, today: string = todayISO()): DayScore[] {
  const since = addDays(today, -(days - 1));
  const focusByDate = new Map<string, number>();
  rows.focus.forEach((f) => focusByDate.set(f.date, (focusByDate.get(f.date) ?? 0) + 1));
  const trainedDates = new Set(rows.sets.map((s) => s.date));
  const weightDates = new Set(rows.weights.map((w) => w.date));
  const sleepDates = new Set(rows.sleeps.map((s) => s.date));
  const habitByDate = new Map(rows.habitDays.map((h) => [h.date, h]));

  const out: DayScore[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(since, i);
    const habitsDone = habitsDoneFor(habitByDate.get(date));
    const trained = trainedDates.has(date);
    let points = habitsDone * 5;
    if (trained) points += 25;
    if (weightDates.has(date)) points += 5;
    if (sleepDates.has(date)) points += 5;
    // Pomodoros: 5 each, capped at four a day so it can't outweigh a workout.
    points += Math.min(focusByDate.get(date) ?? 0, 4) * 5;
    out.push({ date, points, trained, habitsDone });
  }
  return out;
}

/** Scores for the last `days` days, read from the database. (The Hoy screen builds
 * the same thing from its shared recent-activity read instead — see useDailyStreak.) */
export async function computeDailyScores(days: number = STREAK_WINDOW_DAYS): Promise<DayScore[]> {
  const since = addDays(todayISO(), -(days - 1));
  const [sets, habitDays, weights, sleeps, focus] = await Promise.all([
    db.sets.where("date").aboveOrEqual(since).toArray(),
    db.habitDays.where("date").aboveOrEqual(since).toArray(),
    db.weights.where("date").aboveOrEqual(since).toArray(),
    db.sleep.where("date").aboveOrEqual(since).toArray(),
    db.focusSessions.where("date").aboveOrEqual(since).toArray(),
  ]);
  return buildDailyScores({ sets, habitDays, weights, sleeps, focus }, days);
}

/** Grace days per calendar month that keep a streak alive across a missed
 * day instead of resetting it — the same idea as Duolingo's streak freezes
 * or Streaks' "grace days": a streak that punishes one bad day too harshly
 * just trains people to give up on it instead of restarting it. Applied
 * automatically, no need to spend/equip anything. */
const STREAK_FREEZES_PER_MONTH = 2;

export interface StreakResult {
  days: number;
  /** Past dates within the current streak that were covered by a freeze
   * instead of real activity — so the UI can mark them distinctly. */
  frozenDates: Set<string>;
  freezesUsedThisMonth: number;
  freezesAvailable: number;
}

/** Consecutive days up to today (or yesterday, if today has nothing logged
 * *yet* — an in-progress day shouldn't read as a broken streak first thing
 * in the morning) where something — a habit, a workout, a log — happened,
 * tolerating up to STREAK_FREEZES_PER_MONTH gap days (this month's quota,
 * not each visited date's own month — walking a gap back across a month
 * boundary must not grant a second, fresh budget) before the streak
 * actually breaks. */
export function currentDailyStreak(scores: DayScore[]): StreakResult {
  const byDate = new Map(scores.map((s) => [s.date, s]));
  let cursor = todayISO();
  if ((byDate.get(cursor)?.points ?? 0) === 0) cursor = addDays(cursor, -1);

  let days = 0;
  const frozenDates = new Set<string>();
  let freezesUsed = 0;

  for (let day = byDate.get(cursor); day; day = byDate.get(cursor)) {
    if (day.points > 0) {
      days++;
      cursor = addDays(cursor, -1);
      continue;
    }
    if (freezesUsed >= STREAK_FREEZES_PER_MONTH) break;
    freezesUsed++;
    frozenDates.add(cursor);
    cursor = addDays(cursor, -1);
  }

  return { days, frozenDates, freezesUsedThisMonth: freezesUsed, freezesAvailable: STREAK_FREEZES_PER_MONTH - freezesUsed };
}

export function totalPoints(scores: DayScore[]): number {
  return scores.reduce((a, s) => a + s.points, 0);
}

/** Lifetime count of distinct calendar days with *any* qualifying activity
 * (a habit marked, a workout logged, a weight or sleep entry) — the whole
 * history, not just the rolling window, so it only ever grows and can back
 * a rank that feels like a real long-term milestone instead of resetting
 * with the 28-day scoring window. */
export async function totalActiveDays(): Promise<number> {
  const today = todayISO();
  const [before, from] = await Promise.all([activeDaysCount("before", today), activeDaysCount("from", today)]);
  return before + from;
}

/** Distinct active days either strictly before `today` or from it on. The two
 * ranges never overlap, so their counts add up — and they're read separately so
 * that logging something today (which only touches "from") doesn't make the app
 * recount the whole past, which is by far most of the history. Reads only the
 * date index (distinct values), not every row. */
export async function activeDaysCount(range: "before" | "from", today: string): Promise<number> {
  const before = range === "before";
  const keys = (c: Parameters<typeof distinctDates>[0]) => distinctDates(c);
  const [sets, weights, sleeps, focus, habitDays] = await Promise.all([
    keys(before ? db.sets.where("date").below(today) : db.sets.where("date").aboveOrEqual(today)),
    keys(before ? db.weights.where("date").below(today) : db.weights.where("date").aboveOrEqual(today)),
    keys(before ? db.sleep.where("date").below(today) : db.sleep.where("date").aboveOrEqual(today)),
    keys(before ? db.focusSessions.where("date").below(today) : db.focusSessions.where("date").aboveOrEqual(today)),
    before ? db.habitDays.where("date").below(today).toArray() : db.habitDays.where("date").aboveOrEqual(today).toArray(),
  ]);
  const active = new Set<string>([...sets, ...weights, ...sleeps, ...focus]);
  habitDays.forEach((h) => {
    if (habitsDoneFor(h) > 0) active.add(h.date);
  });
  return active.size;
}
