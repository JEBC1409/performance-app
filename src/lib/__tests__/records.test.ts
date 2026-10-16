import { describe, expect, it } from "vitest";
import { personalRecord } from "../records";

const s = (weight: number | null, reps: number | null) => ({ weight, reps });

describe("personalRecord", () => {
  it("is a record when the set implies a higher estimated max", () => {
    const history = [s(40, 10), s(40, 8)];
    expect(personalRecord(history, s(45, 8))).toEqual({ kind: "1rm", estimate: 57 });
    expect(personalRecord(history, s(40, 10))).toBeNull(); // equal is not a record
    expect(personalRecord(history, s(35, 8))).toBeNull();
  });

  it("more reps at a lighter weight can still beat it", () => {
    expect(personalRecord([s(50, 6)], s(40, 16))?.kind).toBe("1rm");
  });

  it("never fires on the very first time an exercise is logged", () => {
    expect(personalRecord([], s(60, 10))).toBeNull();
    expect(personalRecord([s(null, null)], s(60, 10))).toBeNull();
  });

  it("compares bodyweight work by reps", () => {
    expect(personalRecord([s(null, 8), s(null, 10)], s(null, 11))).toEqual({ kind: "reps", estimate: null });
    expect(personalRecord([s(null, 8), s(null, 10)], s(null, 10))).toBeNull();
  });

  it("does not compare a loaded set against unloaded history (or the reverse)", () => {
    expect(personalRecord([s(null, 8)], s(20, 8))).toBeNull();
    expect(personalRecord([s(20, 8)], s(null, 30))).toBeNull();
  });

  it("ignores sets with no reps", () => {
    expect(personalRecord([s(40, 10)], s(100, 0))).toBeNull();
    expect(personalRecord([s(40, 10)], s(100, null))).toBeNull();
  });
});
