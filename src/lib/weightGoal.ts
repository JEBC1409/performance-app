import { addDays, parseISODate } from "./date";

/** A target weight by a date, and where your real pace says you'll land. */

export const CONFIG_WEIGHT_GOAL = "weight_goal";

export interface WeightGoal {
  targetKg: number;
  /** ISO date to get there by. */
  byDate: string;
}

export function sanitizeGoal(value: unknown): WeightGoal | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<WeightGoal>;
  if (typeof v.targetKg !== "number" || !Number.isFinite(v.targetKg) || v.targetKg < 20 || v.targetKg > 400) return null;
  if (typeof v.byDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.byDate)) return null;
  return { targetKg: Math.round(v.targetKg * 10) / 10, byDate: v.byDate };
}

export interface WeightPoint {
  date: string;
  kg: number;
}

const dayMs = 24 * 60 * 60 * 1000;
const daysBetween = (a: string, b: string) => Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / dayMs);

/** Least-squares pace, in kg per week, over the last `windowDays`. Null when
 * there isn't enough to read a trend from (a few weigh-ins over at least a week). */
export function weeklyPace(points: WeightPoint[], today: string, windowDays = 28): number | null {
  const recent = points.filter((p) => daysBetween(p.date, today) <= windowDays && daysBetween(p.date, today) >= 0);
  if (recent.length < 3) return null;
  const xs = recent.map((p) => daysBetween(recent[0].date, p.date));
  if (Math.max(...xs) - Math.min(...xs) < 7) return null;
  const n = recent.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = recent.reduce((a, p) => a + p.kg, 0) / n;
  let num = 0;
  let den = 0;
  recent.forEach((p, i) => {
    num += (xs[i] - mx) * (p.kg - my);
    den += (xs[i] - mx) ** 2;
  });
  return den === 0 ? null : (num / den) * 7;
}

export type GoalStatus = "reached" | "on-track" | "behind" | "wrong-way" | "no-pace" | "expired";

export interface GoalProjection {
  status: GoalStatus;
  currentKg: number;
  /** Signed: negative to lose weight, positive to gain. */
  remainingKg: number;
  daysLeft: number;
  /** Signed kg per week you'd need to hit the date. */
  neededPerWeek: number;
  /** Signed kg per week you're actually doing, if it can be read. */
  pace: number | null;
  /** When your current pace gets you there; null if it never would (or no pace). */
  etaDate: string | null;
}

export function projectGoal(points: WeightPoint[], goal: WeightGoal, today: string): GoalProjection | null {
  if (!points.length) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const currentKg = sorted[sorted.length - 1].kg;
  const remainingKg = Math.round((goal.targetKg - currentKg) * 10) / 10;
  const daysLeft = daysBetween(today, goal.byDate);
  const pace = weeklyPace(sorted, today);
  const neededPerWeek = daysLeft > 0 ? remainingKg / (daysLeft / 7) : remainingKg;
  const base = { currentKg, remainingKg, daysLeft, neededPerWeek, pace };

  if (Math.abs(remainingKg) < 0.3) return { ...base, status: "reached", etaDate: null };
  if (pace == null) return { ...base, status: daysLeft < 0 ? "expired" : "no-pace", etaDate: null };
  // Moving away from the target, or not at all.
  if (pace * Math.sign(remainingKg) < 0.02) return { ...base, status: daysLeft < 0 ? "expired" : "wrong-way", etaDate: null };

  const etaDays = Math.ceil((remainingKg / pace) * 7);
  const etaDate = etaDays <= 365 * 5 ? addDays(today, etaDays) : null;
  if (daysLeft < 0) return { ...base, status: "expired", etaDate };
  return { ...base, status: etaDate && etaDate <= goal.byDate ? "on-track" : "behind", etaDate };
}
