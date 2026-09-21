/** Minutes of focused work that close the Focus ring: four 25-minute blocks. */
export const FOCUS_DAILY_GOAL_MIN = 100;

/** Progress fractions for the day, each capped at 1. `trainingSlot` is what
 * today's session would be; a rest day counts as done so it never nags. */
export function ringPercents(o: {
  habitsDone: number;
  habitsTotal: number;
  setsDone: number;
  setsTarget: number;
  rest: boolean;
  focusMin: number;
}): { habits: number; workout: number; focus: number } {
  const cap = (n: number) => Math.max(0, Math.min(1, n));
  return {
    habits: o.habitsTotal > 0 ? cap(o.habitsDone / o.habitsTotal) : 0,
    workout: o.rest && o.setsDone === 0 ? 1 : o.setsTarget > 0 ? cap(o.setsDone / o.setsTarget) : 0,
    focus: cap(o.focusMin / FOCUS_DAILY_GOAL_MIN),
  };
}
