import { addDays, startOfWeek } from "@/lib/date";

/** Pure helpers that keep the Datos charts readable however much history there
 * is: a year of daily weights becomes ~52 weekly points, a year of lifts
 * becomes the last dozen logged weeks. */

export interface DatedPoint {
  date: string;
  value: number;
}

/** How far back a trend chart looks, in days. */
export type Range = 30 | 90 | 365;

export const RANGES: { key: Range; label: string }[] = [
  { key: 30, label: "30 días" },
  { key: 90, label: "90 días" },
  { key: 365, label: "1 año" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Points inside the range. A full year is averaged per week (dated on the
 * week's Monday) so 365 daily readings don't turn into a smear of dots. */
export function windowSeries(points: DatedPoint[], range: Range, today: string): DatedPoint[] {
  const from = addDays(today, -range);
  const inRange = points.filter((p) => p.date >= from && p.date <= today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (range < 365) return inRange;
  const byWeek = new Map<string, number[]>();
  for (const p of inRange) {
    const wk = startOfWeek(p.date);
    const list = byWeek.get(wk);
    if (list) list.push(p.value);
    else byWeek.set(wk, [p.value]);
  }
  return Array.from(byWeek.keys())
    .sort()
    .map((wk) => {
      const vals = byWeek.get(wk)!;
      return { date: wk, value: round2(vals.reduce((a, b) => a + b, 0) / vals.length) };
    });
}

/** Entries that carry a value, each with its change against the previous one
 * that also had a value (rounded to a tenth, the precision of a tape measure). */
export function withDeltas(rows: { date: string; value: number | null }[]): { date: string; value: number; delta: number | null }[] {
  let prev: number | null = null;
  const out: { date: string; value: number; delta: number | null }[] = [];
  for (const r of rows) {
    if (r.value == null) continue;
    out.push({ date: r.date, value: r.value, delta: prev != null ? Math.round((r.value - prev) * 10) / 10 : null });
    prev = r.value;
  }
  return out;
}

export interface WeekBest {
  weekStart: string;
  value: number;
}

/** Heaviest set of each week that has any, oldest first, keeping only the last
 * `weeks` of them. `start` (the working weight you declared in your routine)
 * counts for the week it was given unless a heavier set was logged that week. */
export function weeklyBest(
  sets: { date: string; weight: number | null }[],
  start: { kg: number; asOf: string } | undefined,
  weeks: number,
): WeekBest[] {
  const byWeek = new Map<string, number>();
  for (const s of sets) {
    if (s.weight == null) continue;
    const wk = startOfWeek(s.date);
    byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, s.weight));
  }
  if (start) {
    const wk = startOfWeek(start.asOf);
    byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, start.kg));
  }
  return Array.from(byWeek.keys())
    .sort()
    .slice(-weeks)
    .map((wk) => ({ weekStart: wk, value: byWeek.get(wk)! }));
}

/** Change shown on a lift: last week's best against the first week in view, or
 * against the declared working weight when it's in view (older sessions may
 * have counted the load differently, so a raw first-to-last would mislead).
 * Null when there's only one week to look at. */
export function loadChange(points: WeekBest[], startWeek?: string): number | null {
  if (points.length < 2) return null;
  const idx = startWeek ? Math.max(0, points.findIndex((p) => p.weekStart === startWeek)) : 0;
  if (idx >= points.length - 1) return null;
  return Math.round((points[points.length - 1].value - points[idx].value) * 100) / 100;
}
