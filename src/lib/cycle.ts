export type GymDay = "A" | "B" | "C";
export type CycleSlot = GymDay | "rest";

const ORDER: CycleSlot[] = ["A", "B", "C", "rest"];

/** A → B → C → descanso → repetir, driven by how many training sessions have been logged. */
export function nextCycleSlot(sessionsLogged: number): CycleSlot {
  return ORDER[sessionsLogged % 4];
}

/** The slot after `slot` in the A → B → C → descanso cycle. */
export function slotAfter(slot: CycleSlot): CycleSlot {
  return ORDER[(ORDER.indexOf(slot) + 1) % ORDER.length];
}
