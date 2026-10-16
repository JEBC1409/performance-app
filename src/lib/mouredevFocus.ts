import { addDays } from "./date";

/** Focus blocks count toward the MoureDev route when their task names it. */
export function isMouredevTask(task: string): boolean {
  return /moure|python/i.test(task);
}

export interface WeekRange {
  week: number;
  /** First day of the week (ISO) — the date set on the route's row. */
  date: string;
}

export interface FocusLike {
  date: string;
  task: string;
  minutes: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Hours of MoureDev Focus per route week. A week runs seven days from the date
 * on its row; rows without a date can't receive any. */
export function focusHoursByWeek(weeks: WeekRange[], sessions: FocusLike[]): Map<number, number> {
  const ranges = weeks.filter((w) => /^\d{4}-\d{2}-\d{2}$/.test(w.date)).map((w) => ({ week: w.week, from: w.date, to: addDays(w.date, 6) }));
  const minutes = new Map<number, number>();
  for (const s of sessions) {
    if (!isMouredevTask(s.task) || !(s.minutes > 0)) continue;
    const r = ranges.find((x) => s.date >= x.from && s.date <= x.to);
    if (r) minutes.set(r.week, (minutes.get(r.week) ?? 0) + s.minutes);
  }
  return new Map([...minutes].map(([week, m]) => [week, round1(m / 60)]));
}

/** What a week counts for: the larger of what you wrote down and what Focus
 * measured, so noting the same time by hand doesn't count it twice. */
export function effectiveHours(manual: number | null | undefined, focus: number): number {
  return round1(Math.max(manual ?? 0, focus));
}
