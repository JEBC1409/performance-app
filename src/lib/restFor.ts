/** Heavy compound lifts need the long rest; small isolation work recovers fast.
 * One rest time for everything means too little after a press or too much after
 * a curl. */
const COMPOUND = /press|sentadilla|prensa|peso muerto|remo|jal[oó]n|dominada|fondos|militar|hip thrust|zancada/i;

export const ISOLATION_REST_SEC = 90;

export function isCompound(exercise: string): boolean {
  return COMPOUND.test(exercise);
}

/** Rest after a set of `exercise`: your usual one for compounds, at most 90 s
 * for isolation work (when the shorter rest is on). */
export function restSecondsFor(exercise: string, defaultSec: number, shortIsolation: boolean): number {
  if (!shortIsolation || isCompound(exercise)) return defaultSec;
  return Math.min(defaultSec, ISOLATION_REST_SEC);
}
