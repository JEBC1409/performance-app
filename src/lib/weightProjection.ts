import { parseISODate } from "./date";

export interface WeightPoint {
  date: string;
  weight: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Least-squares slope in kg/week over the given points (needs >= 2 points). */
export function weeklyRate(points: WeightPoint[]): number {
  if (points.length < 2) return 0;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const t0 = parseISODate(sorted[0].date).getTime();
  const xs = sorted.map((p) => (parseISODate(p.date).getTime() - t0) / DAY_MS);
  const ys = sorted.map((p) => p.weight);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  const slopePerDay = (n * sumXY - sumX * sumY) / denom;
  return slopePerDay * 7;
}

export interface ProjectionPoint {
  weeksAhead: number;
  weight: number;
}

export function projectForward(points: WeightPoint[], weeksAhead: number, goalPerWeek: number): ProjectionPoint[] {
  if (!points.length) return [];
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const rate = weeklyRate(sorted) || goalPerWeek;
  const out: ProjectionPoint[] = [];
  for (let w = 0; w <= weeksAhead; w++) {
    out.push({ weeksAhead: w, weight: last.weight + rate * w });
  }
  return out;
}

export interface RateAlert {
  rate: number;
  overPace: boolean;
  suggestion: string | null;
}

/** Flags when the actual weekly gain exceeds 1kg/week, regardless of the personal goal. */
export function evaluateRate(points: WeightPoint[]): RateAlert {
  const rate = weeklyRate(points);
  const overPace = rate > 1;
  return {
    rate,
    overPace,
    suggestion: overPace ? "Subiendo más de 1 kg/semana — considerá bajar ~200 kcal/día." : null,
  };
}
