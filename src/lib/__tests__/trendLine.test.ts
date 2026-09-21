import { describe, expect, it } from "vitest";
import { trendLine } from "../trend";

describe("trendLine", () => {
  it("finds the slope of a straight rise", () => {
    const t = trendLine([70, 71, 72, 73])!;
    expect(t.slope).toBeCloseTo(1);
    expect(t.intercept).toBeCloseTo(70);
  });
  it("is flat for constant data and null for under two points", () => {
    expect(trendLine([5, 5, 5])!.slope).toBe(0);
    expect(trendLine([5])).toBeNull();
    expect(trendLine([])).toBeNull();
  });
  it("smooths noise into an overall direction", () => {
    expect(trendLine([72, 71.4, 72.3, 71.8, 72.6, 72.1, 72.9])!.slope).toBeGreaterThan(0);
  });
});
