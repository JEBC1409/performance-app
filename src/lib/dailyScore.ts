import { db, type HabitDayRecord } from "@/db/db";
import { HABIT_LIST } from "@/data/habits";
import { addDays, todayISO } from "./date";

export const STREAK_WINDOW_DAYS = 28;

export interface DayScore {
  date: string;
  points: number;
  trained: boolean;
  habitsDone: number;
}

function habitsDoneFor(day: HabitDayRecord | undefined): number {
  if (!day) return 0;
  return HABIT_LIST.filter((h) => !!day[h.key]).length;
}

/** One entry per day in the window, oldest first, even for days with
 * nothing logged (points: 0) — the streak/rank math below needs the full,
 * gapless run to walk backward correctly. */
export async function computeDailyScores(days: number = STREAK_WINDOW_DAYS): Promise<DayScore[]> {
  const since = addDays(todayISO(), -(days - 1));
  const [sets, habitDays, weights, sleeps] = await Promise.all([
    db.sets.where("date").aboveOrEqual(since).toArray(),
    db.habitDays.where("date").aboveOrEqual(since).toArray(),
    db.weights.where("date").aboveOrEqual(since).toArray(),
    db.sleep.where("date").aboveOrEqual(since).toArray(),
  ]);

  const trainedDates = new Set(sets.map((s) => s.date));
  const weightDates = new Set(weights.map((w) => w.date));
  const sleepDates = new Set(sleeps.map((s) => s.date));
  const habitByDate = new Map(habitDays.map((h) => [h.date, h]));

  const out: DayScore[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(since, i);
    const habitsDone = habitsDoneFor(habitByDate.get(date));
    const trained = trainedDates.has(date);
    let points = habitsDone * 5;
    if (trained) points += 25;
    if (weightDates.has(date)) points += 5;
    if (sleepDates.has(date)) points += 5;
    out.push({ date, points, trained, habitsDone });
  }
  return out;
}

/** Grace days per calendar month that keep a streak alive across a missed
 * day instead of resetting it — the same idea as Duolingo's streak freezes
 * or Streaks' "grace days": a streak that punishes one bad day too harshly
 * just trains people to give up on it instead of restarting it. Applied
 * automatically, no need to spend/equip anything. */
export const STREAK_FREEZES_PER_MONTH = 2;

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
  const [sets, habitDays, weights, sleeps] = await Promise.all([
    db.sets.toArray(),
    db.habitDays.toArray(),
    db.weights.toArray(),
    db.sleep.toArray(),
  ]);
  const active = new Set<string>();
  sets.forEach((s) => active.add(s.date));
  weights.forEach((w) => active.add(w.date));
  sleeps.forEach((s) => active.add(s.date));
  habitDays.forEach((h) => {
    if (habitsDoneFor(h) > 0) active.add(h.date);
  });
  return active.size;
}
