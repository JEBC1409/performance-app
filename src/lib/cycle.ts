export type GymDay = "A" | "B" | "C";
export type CycleSlot = GymDay | "rest";

const ORDER: CycleSlot[] = ["A", "B", "C", "rest"];

const mod4 = (n: number) => ((n % 4) + 4) % 4;

/** A → B → C → descanso → repetir, driven by how many training sessions have been logged.
 * `offset` shifts the position when the user says "I'm actually on B now". */
export function nextCycleSlot(sessionsLogged: number, offset = 0): CycleSlot {
  return ORDER[mod4(sessionsLogged + offset)];
}

/** The offset that makes `slot` the current one after `sessionsLogged` sessions. */
export function offsetForSlot(slot: CycleSlot, sessionsLogged: number): number {
  return mod4(ORDER.indexOf(slot) - sessionsLogged);
}

/** The slot after `slot` in the A → B → C → descanso cycle. */
export function slotAfter(slot: CycleSlot): CycleSlot {
  return ORDER[(ORDER.indexOf(slot) + 1) % ORDER.length];
}
