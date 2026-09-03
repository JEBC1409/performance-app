import { describe, expect, it } from "vitest";
import { weeklyRate, projectForward, evaluateRate } from "../weightProjection";

const steady = [
  { date: "2026-08-01", weight: 72 },
  { date: "2026-08-08", weight: 72.5 },
  { date: "2026-08-15", weight: 73 },
];

describe("weeklyRate", () => {
  it("computes kg/week from a linear trend", () => {
    expect(weeklyRate(steady)).toBeCloseTo(0.5, 2);
  });

  it("returns 0 with fewer than two points", () => {
    expect(weeklyRate([{ date: "2026-08-01", weight: 72 }])).toBe(0);
  });
});

describe("evaluateRate", () => {
  it("flags a pace over 1kg/week", () => {
    const steep = [
      { date: "2026-08-01", weight: 72 },
      { date: "2026-08-08", weight: 74 },
    ];
    const result = evaluateRate(steep);
    expect(result.overPace).toBe(true);
    expect(result.suggestion).toMatch(/200 kcal/);
  });

  it("does not flag a pace on target", () => {
    expect(evaluateRate(steady).overPace).toBe(false);
  });
});

describe("projectForward", () => {
  it("projects weight forward using the observed rate", () => {
    const projection = projectForward(steady, 4, 0.5);
    expect(projection).toHaveLength(5);
    expect(projection[0].weight).toBeCloseTo(73, 2);
    expect(projection[4].weight).toBeCloseTo(75, 2);
  });
});
