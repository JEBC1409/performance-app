import { describe, expect, it } from "vitest";
import type { SetRecord } from "@/db/db";
import { reviewSession } from "../sessionReview";

let id = 0;
const set = (over: Partial<SetRecord>): SetRecord => ({
  id: ++id,
  date: "2026-09-28",
  day: "A",
  exercise: "Jalón al pecho agarre ancho",
  setIndex: 1,
  weight: 66,
  reps: 8,
  toFailure: null,
  rpe: null,
  note: "",
  createdAt: 1_000_000,
  ...over,
});

const review = (today: SetRecord[], all: SetRecord[] = []) => reviewSession("A", "2026-09-28", today, [...all, ...today]);
const find = (r: ReturnType<typeof review>, name: string) => r.exercises.find((e) => e.name === name)!;

describe("reviewSession", () => {
  it("compares with the declared starting weight when there's no newer history", () => {
    const r = review([set({ weight: 68, reps: 8 })]);
    const e = find(r, "Jalón al pecho agarre ancho"); // start 66 kg
    expect(e.verdict).toBe("weight-up");
    expect(e.deltaWeight).toBeCloseTo(2);
    expect(e.prev).toMatchObject({ weight: 66, date: null });
  });

  it("matching the starting weight without reps to compare is just 'start'", () => {
    expect(find(review([set({ weight: 66, reps: 8 })]), "Jalón al pecho agarre ancho").verdict).toBe("start");
  });

  it("more weight beats more reps; same weight compares reps", () => {
    const before = [set({ date: "2026-09-25", weight: 66, reps: 8 })];
    expect(find(review([set({ weight: 68, reps: 6 })], before), "Jalón al pecho agarre ancho").verdict).toBe("weight-up");
    const up = find(review([set({ weight: 66, reps: 10 })], before), "Jalón al pecho agarre ancho");
    expect(up).toMatchObject({ verdict: "reps-up", deltaReps: 2 });
    expect(find(review([set({ weight: 66, reps: 8 })], before), "Jalón al pecho agarre ancho").verdict).toBe("same");
    expect(find(review([set({ weight: 66, reps: 6 })], before), "Jalón al pecho agarre ancho").verdict).toBe("down");
  });

  it("uses the last session, not the declared weight, once there is one after it", () => {
    const before = [set({ date: "2026-09-25", weight: 70, reps: 8 })];
    const e = find(review([set({ weight: 68, reps: 8 })], before), "Jalón al pecho agarre ancho");
    expect(e.verdict).toBe("down");
    expect(e.prev).toMatchObject({ weight: 70, date: "2026-09-25" });
  });

  it("flags a new estimated-1RM record only when there was something to beat", () => {
    const before = [set({ date: "2026-09-25", weight: 66, reps: 8 })];
    expect(find(review([set({ weight: 68, reps: 8 })], before), "Jalón al pecho agarre ancho").pr).toBe(true);
    expect(find(review([set({ weight: 66, reps: 8 })], before), "Jalón al pecho agarre ancho").pr).toBe(false);
    expect(find(review([set({ weight: 68, reps: 8 })]), "Jalón al pecho agarre ancho").pr).toBe(false);
  });

  it("compares total volume with the previous session of the same day, and counts improvements", () => {
    const before = [
      set({ date: "2026-09-21", weight: 60, reps: 10 }), // 600
      set({ date: "2026-09-21", weight: 60, reps: 10 }), // 600 → 1200
      set({ date: "2026-09-24", day: "B", exercise: "Pec deck", weight: 200, reps: 10 }), // other day: ignored
    ];
    const r = review([set({ weight: 66, reps: 10 }), set({ weight: 66, reps: 10 })], before); // 1320
    expect(r.volume).toBe(1320);
    expect(r.prevVolume).toBe(1200);
    expect(r.prevDate).toBe("2026-09-21");
    expect(r.volumeDeltaPct).toBeCloseTo(10);
    expect(r.improved).toBe(1);
  });

  it("reports duration from the first to the last set, ignoring sets entered hours apart", () => {
    const quick = review([set({ createdAt: 0 }), set({ createdAt: 45 * 60_000 })]);
    expect(quick.durationMin).toBe(45);
    const spread = review([set({ createdAt: 0 }), set({ createdAt: 9 * 3600_000 })]);
    expect(spread.durationMin).toBeNull();
  });

  it("counts sets, sets to failure and the day's total target", () => {
    const r = review([set({ toFailure: true }), set({ toFailure: null })]);
    expect(r).toMatchObject({ setsDone: 2, toFailure: 1, setsTarget: 27 });
  });
});
