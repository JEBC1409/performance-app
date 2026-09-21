import { describe, expect, it } from "vitest";
import { FOCUS_DAILY_GOAL_MIN, ringPercents } from "../dayRings";

const base = { habitsDone: 0, habitsTotal: 6, setsDone: 0, setsTarget: 27, rest: false, focusMin: 0 };

describe("ringPercents", () => {
  it("starts empty and fills proportionally", () => {
    expect(ringPercents(base)).toEqual({ habits: 0, workout: 0, focus: 0 });
    const p = ringPercents({ ...base, habitsDone: 3, setsDone: 9, focusMin: FOCUS_DAILY_GOAL_MIN / 2 });
    expect(p.habits).toBeCloseTo(0.5);
    expect(p.workout).toBeCloseTo(1 / 3);
    expect(p.focus).toBeCloseTo(0.5);
  });
  it("caps at 1 however far you go", () => {
    const p = ringPercents({ ...base, habitsDone: 9, setsDone: 40, focusMin: 400 });
    expect(p).toEqual({ habits: 1, workout: 1, focus: 1 });
  });
  it("counts a rest day as done, but not once you've trained anyway", () => {
    expect(ringPercents({ ...base, rest: true, setsTarget: 0 }).workout).toBe(1);
    expect(ringPercents({ ...base, rest: true, setsDone: 5 }).workout).toBeCloseTo(5 / 27);
  });
  it("copes with no habits or no target", () => {
    expect(ringPercents({ ...base, habitsTotal: 0 }).habits).toBe(0);
    expect(ringPercents({ ...base, setsTarget: 0 }).workout).toBe(0);
  });
});
