import { describe, expect, it } from "vitest";
import { epley1RM, roundKg } from "../epley";

describe("epley1RM", () => {
  it("returns the weight itself for a single rep", () => {
    expect(epley1RM(100, 1)).toBe(100);
  });

  it("estimates 1RM using the Epley formula", () => {
    expect(epley1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(epley1RM(60, 5)).toBeCloseTo(70, 1);
  });

  it("returns 0 for invalid input", () => {
    expect(epley1RM(0, 10)).toBe(0);
    expect(epley1RM(NaN, 10)).toBe(0);
  });
});

describe("roundKg", () => {
  it("rounds to one decimal place", () => {
    expect(roundKg(72.34)).toBe(72.3);
    expect(roundKg(72.36)).toBe(72.4);
  });
});
