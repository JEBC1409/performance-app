import { addDays, todayISO } from "./date";

export interface HabitDayLike {
  date: string;
}

function getField(d: HabitDayLike, key: string): unknown {
  return (d as unknown as Record<string, unknown>)[key];
}

/**
 * Consecutive days (ending at `from`) where habitKey is truthy, breaking on the first missed day.
 * If `from` has no record at all (e.g. today, before it's been logged), the count starts from the day before instead.
 */
export function currentStreak<T extends HabitDayLike>(days: T[], habitKey: string, from: string = todayISO()): number {
  const byDate = new Map(days.map((d) => [d.date, d]));
  let cursor = from;
  if (byDate.get(cursor) === undefined) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  let day = byDate.get(cursor);
  while (day && getField(day, habitKey)) {
    streak++;
    cursor = addDays(cursor, -1);
    day = byDate.get(cursor);
  }
  return streak;
}

export function totalCount<T extends HabitDayLike>(days: T[], habitKey: string): number {
  return days.filter((d) => !!getField(d, habitKey)).length;
}
