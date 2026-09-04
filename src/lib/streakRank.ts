export interface StreakTier {
  key: string;
  label: string;
  color: string;
  sides: number;
  /** Total lifetime "active days" (any day with a habit, workout, weight or
   * sleep log) required to reach this tier. */
  minDays: number;
}

/** A discipline/consistency ladder, deliberately unrelated to the muscle
 * rank (Hierro/Bronce.../Simétrico) so the two "racha" and "ranked" ideas
 * don't collide — inspired by how Duolingo's Wildfire badge and apps like
 * HabitStreak name/pace their streak tiers: early levels come within days,
 * the top ones only after real sustained use (Duolingo's own milestones
 * sit at 7/30/100/365 days; HabitStreak runs Beginner → Habit Master). */
export const STREAK_TIERS: StreakTier[] = [
  { key: "principiante", label: "Principiante", color: "#8a8f98", sides: 3, minDays: 0 },
  { key: "novato", label: "Novato", color: "#6fae52", sides: 4, minDays: 5 },
  { key: "aprendiz", label: "Aprendiz", color: "#4fa8c9", sides: 5, minDays: 15 },
  { key: "constante", label: "Constante", color: "#5b7fe0", sides: 6, minDays: 30 },
  { key: "disciplinado", label: "Disciplinado", color: "#a15be0", sides: 6, minDays: 60 },
  { key: "forjado", label: "Forjado", color: "#df7b25", sides: 8, minDays: 100 },
  { key: "implacable", label: "Implacable", color: "#df2531", sides: 8, minDays: 180 },
  { key: "leyenda", label: "Leyenda", color: "#ffd166", sides: 0, minDays: 365 },
];

export interface StreakRankProgress {
  tier: StreakTier;
  next: StreakTier | null;
  /** 0–1 fill through the current tier's band. */
  pct: number;
  daysToNext: number | null;
}

export function streakRankProgress(activeDays: number): StreakRankProgress {
  let idx = 0;
  for (let i = 0; i < STREAK_TIERS.length; i++) {
    if (activeDays >= STREAK_TIERS[i].minDays) idx = i;
  }
  const tier = STREAK_TIERS[idx];
  const next = STREAK_TIERS[idx + 1] ?? null;
  if (!next) return { tier, next: null, pct: 1, daysToNext: null };
  const span = next.minDays - tier.minDays;
  const into = activeDays - tier.minDays;
  const pct = span > 0 ? Math.min(1, Math.max(0, into / span)) : 1;
  return { tier, next, pct, daysToNext: Math.max(0, next.minDays - activeDays) };
}
