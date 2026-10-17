import { addDays } from "./date";

/** Plain "how did this change" helpers for the Datos charts. Points are dated
 * values (a weight, hours slept…); nothing here knows what they measure. */
export interface DatedValue {
  date: string;
  value: number;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Latest value on or before `date`, or null. */
export function valueOnOrBefore(points: DatedValue[], date: string): DatedValue | null {
  let best: DatedValue | null = null;
  for (const p of points) if (p.date <= date && (best == null || p.date > best.date)) best = p;
  return best;
}

/** Change between the latest point and where things stood `days` ago (the last
 * point on or before that day). Null when there's nothing that old to compare
 * with, so a brand-new log never shows a made-up trend. */
export function changeOver(points: DatedValue[], days: number, today: string): { from: number; to: number; diff: number } | null {
  const latest = valueOnOrBefore(points, today);
  const before = valueOnOrBefore(points, addDays(today, -days));
  if (!latest || !before || latest.date === before.date) return null;
  return { from: before.value, to: latest.value, diff: round1(latest.value - before.value) };
}

/** Average of the last `days` days against the `days` before them. Null unless
 * both windows have at least one value. */
export function windowChange(points: DatedValue[], days: number, today: string): { current: number; previous: number; diff: number; currentCount: number } | null {
  const start = addDays(today, -(days - 1));
  const prevStart = addDays(start, -days);
  const cur = points.filter((p) => p.date >= start && p.date <= today).map((p) => p.value);
  const prev = points.filter((p) => p.date >= prevStart && p.date < start).map((p) => p.value);
  if (!cur.length || !prev.length) return null;
  const c = avg(cur);
  const p = avg(prev);
  // The difference is taken between the rounded figures, so what's shown always adds up.
  const rc = round1(c);
  const rp = round1(p);
  return { current: rc, previous: rp, diff: round1(rc - rp), currentCount: cur.length };
}

/** Current average of the last `days` days alone, or null with no values in it. */
export function windowAverage(points: DatedValue[], days: number, today: string): number | null {
  const start = addDays(today, -(days - 1));
  const vals = points.filter((p) => p.date >= start && p.date <= today).map((p) => p.value);
  return vals.length ? round1(avg(vals)) : null;
}
