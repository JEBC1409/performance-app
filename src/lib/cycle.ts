export type GymDay = "A" | "B" | "C";
export type CycleSlot = GymDay | "rest";

const ORDER: CycleSlot[] = ["A", "B", "C", "rest"];

/** A → B → C → descanso → repetir, driven by how many training sessions have been logged. */
export function nextCycleSlot(sessionsLogged: number): CycleSlot {
  return ORDER[sessionsLogged % 4];
}
