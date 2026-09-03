/** Epley formula: 1RM = weight * (1 + reps/30). Reps <= 1 returns the weight itself. */
export function epley1RM(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0) return 0;
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function roundKg(n: number): number {
  return Math.round(n * 10) / 10;
}
