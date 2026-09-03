import { describe, expect, it } from "vitest";
import { fromKg, toKg, unitLabel } from "../units";

describe("fromKg", () => {
  it("passes kg through unchanged", () => {
    expect(fromKg(72, "kg")).toBe(72);
  });

  it("converts kg to lb", () => {
    expect(fromKg(72, "lb")).toBeCloseTo(158.7, 1);
  });
});

describe("toKg", () => {
  it("passes kg through unchanged", () => {
    expect(toKg(72, "kg")).toBe(72);
  });

  it("converts lb back to kg", () => {
    expect(toKg(158.7, "lb")).toBeCloseTo(72, 1);
  });

  it("round-trips through fromKg without drift", () => {
    const original = 83.4;
    expect(toKg(fromKg(original, "lb"), "lb")).toBeCloseTo(original, 1);
  });
});

describe("unitLabel", () => {
  it("labels each unit", () => {
    expect(unitLabel("kg")).toBe("kg");
    expect(unitLabel("lb")).toBe("lb");
  });
});
