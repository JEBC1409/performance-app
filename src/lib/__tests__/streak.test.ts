import { describe, expect, it } from "vitest";
import { currentStreak, totalCount } from "../streak";

const days = [
  { date: "2026-08-01", sleep: true },
  { date: "2026-08-02", sleep: true },
  { date: "2026-08-03", sleep: false },
  { date: "2026-08-04", sleep: true },
  { date: "2026-08-05", sleep: true },
  { date: "2026-08-06", sleep: true },
];

describe("currentStreak", () => {
  it("counts consecutive truthy days ending at the given date", () => {
    expect(currentStreak(days, "sleep", "2026-08-06")).toBe(3);
  });

  it("breaks on a missed day", () => {
    expect(currentStreak(days, "sleep", "2026-08-03")).toBe(0);
  });

  it("falls back to yesterday when today has no record", () => {
    expect(currentStreak(days, "sleep", "2026-08-07")).toBe(3);
  });

  it("returns 0 for an unknown habit key", () => {
    expect(currentStreak(days, "water", "2026-08-06")).toBe(0);
  });
});

describe("totalCount", () => {
  it("counts all truthy days regardless of order or gaps", () => {
    expect(totalCount(days, "sleep")).toBe(5);
  });
});
