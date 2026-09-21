import type { FocusSessionRecord, HabitDayRecord, HabitDefRecord, MoureWeekRecord, SetRecord, SleepRecord, WeightRecord } from "@/db/db";
import { addDays } from "./date";
import { setVolume } from "./sessionReview";

/** One Monday-to-Sunday week of everything the app tracks, ready to compare
 * with the week before. Pure: pass in the rows, get numbers out. */

export interface WeekInput {
  sets: SetRecord[];
  focus: FocusSessionRecord[];
  habitDays: HabitDayRecord[];
  habitDefs: HabitDefRecord[];
  weights: WeightRecord[];
  sleep: SleepRecord[];
  moure: MoureWeekRecord[];
}

export interface HabitWeek {
  key: string;
  label: string;
  /** Days this week it was marked done. */
  days: number;
}

export interface WeekStats {
  start: string;
  end: string;
  /** Days of the week that have happened so far (7 for a finished week). */
  elapsedDays: number;
  /** Per weekday (Mon..Sun): anything logged that day. */
  activeByDay: boolean[];
  activeDays: number;
  workouts: number;
  sets: number;
  volume: number;
  focusBlocks: number;
  focusMinutes: number;
  focusDays: number;
  habits: HabitWeek[];
  habitPct: number | null;
  sleepAvg: number | null;
  sleepNights: number;
  weightAvg: number | null;
  weightLast: number | null;
  moureHours: number | null;
}

const inWeek = (date: string, start: string, end: string) => date >= start && date <= end;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function weekStats(input: WeekInput, weekStart: string, today: string): WeekStats {
  const end = addDays(weekStart, 6);
  const last = today < end ? today : end;
  const elapsedDays = today < weekStart ? 0 : Math.min(7, daysBetween(weekStart, last) + 1);

  const sets = input.sets.filter((s) => inWeek(s.date, weekStart, end));
  const focus = input.focus.filter((f) => inWeek(f.date, weekStart, end));
  const habitDays = input.habitDays.filter((h) => inWeek(h.date, weekStart, end));
  const weights = input.weights.filter((w) => inWeek(w.date, weekStart, end) && w.weightKg != null).sort((a, b) => (a.date < b.date ? -1 : 1));
  const sleep = input.sleep.filter((s) => inWeek(s.date, weekStart, end) && s.hours != null);
  const moure = input.moure.filter((m) => inWeek(m.date, weekStart, end) && m.hours != null);

  const active = new Set<string>();
  sets.forEach((s) => active.add(s.date));
  focus.forEach((f) => active.add(f.date));
  habitDays.forEach((h) => h.done.length && active.add(h.date));
  weights.forEach((w) => active.add(w.date));
  sleep.forEach((s) => active.add(s.date));
  const activeByDay = Array.from({ length: 7 }, (_, i) => active.has(addDays(weekStart, i)));

  const habits: HabitWeek[] = [...input.habitDefs]
    .sort((a, b) => a.order - b.order)
    .map((d) => ({ key: d.key, label: d.label, days: habitDays.filter((h) => h.done.includes(d.key)).length }));
  const possible = habits.length * elapsedDays;

  return {
    start: weekStart,
    end,
    elapsedDays,
    activeByDay,
    activeDays: activeByDay.filter(Boolean).length,
    workouts: new Set(sets.map((s) => s.date)).size,
    sets: sets.length,
    volume: sets.reduce((a, s) => a + setVolume(s), 0),
    focusBlocks: focus.length,
    focusMinutes: focus.reduce((a, f) => a + f.minutes, 0),
    focusDays: new Set(focus.map((f) => f.date)).size,
    habits,
    habitPct: possible > 0 ? habits.reduce((a, h) => a + h.days, 0) / possible : null,
    sleepAvg: avg(sleep.map((s) => s.hours as number)),
    sleepNights: sleep.length,
    weightAvg: avg(weights.map((w) => w.weightKg as number)),
    weightLast: weights.length ? (weights[weights.length - 1].weightKg as number) : null,
    moureHours: moure.length ? moure.reduce((a, m) => a + (m.hours as number), 0) : null,
  };
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

export interface Delta {
  diff: number;
  /** Direction of change: "up", "down" or "flat" (within noise). */
  dir: "up" | "down" | "flat";
}

/** Change from the previous week, or null when either side has no value. */
export function delta(cur: number | null, prev: number | null, noise = 0): Delta | null {
  if (cur == null || prev == null) return null;
  const diff = cur - prev;
  return { diff, dir: Math.abs(diff) <= noise ? "flat" : diff > 0 ? "up" : "down" };
}
