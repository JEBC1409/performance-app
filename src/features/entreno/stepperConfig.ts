/** Weight jumps a "paso" chip cycles through, and the last choice remembered
 * across exercises and sessions (0.5 kg for isolation work, 5 kg for a heavy
 * compound — whatever you left it on). */
export const WEIGHT_STEPS = [0.5, 1, 2.5, 5];
const STEP_KEY = "performance_gym_step_v1";

export function readStep(): number {
  try {
    const n = Number(localStorage.getItem(STEP_KEY));
    return WEIGHT_STEPS.includes(n) ? n : 2.5;
  } catch {
    return 2.5;
  }
}

export function writeStep(step: number): void {
  try {
    localStorage.setItem(STEP_KEY, String(step));
  } catch {
    /* not remembered */
  }
}

export const fmtNum = (n: number) => String(Math.round(n * 10) / 10);
