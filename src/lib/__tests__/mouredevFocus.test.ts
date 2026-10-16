import { describe, expect, it } from "vitest";
import { effectiveHours, focusHoursByWeek, isMouredevTask } from "../mouredevFocus";

describe("isMouredevTask", () => {
  it("matches tasks that name MoureDev or Python, any case", () => {
    expect(isMouredevTask("MoureDev — clase 4")).toBe(true);
    expect(isMouredevTask("estudiar python")).toBe(true);
    expect(isMouredevTask("Terminar el módulo de React")).toBe(false);
  });
});

describe("focusHoursByWeek", () => {
  const weeks = [
    { week: 1, date: "2026-06-04" },
    { week: 2, date: "2026-06-11" },
    { week: 3, date: "" },
  ];
  it("puts each block in the week whose seven days contain it, and sums in hours", () => {
    const out = focusHoursByWeek(weeks, [
      { date: "2026-06-04", task: "MoureDev", minutes: 25 },
      { date: "2026-06-10", task: "python ejercicios", minutes: 50 },
      { date: "2026-06-11", task: "MoureDev", minutes: 25 },
      { date: "2026-06-12", task: "Leer", minutes: 25 }, // not MoureDev
      { date: "2026-01-01", task: "MoureDev", minutes: 25 }, // before any week
    ]);
    expect(out.get(1)).toBe(1.3); // 75 min
    expect(out.get(2)).toBe(0.4);
    expect(out.has(3)).toBe(false);
  });
});

describe("effectiveHours", () => {
  it("is the larger of written and measured, so the same time is not counted twice", () => {
    expect(effectiveHours(3, 1.5)).toBe(3);
    expect(effectiveHours(null, 1.5)).toBe(1.5);
    expect(effectiveHours(1, 2.5)).toBe(2.5);
    expect(effectiveHours(null, 0)).toBe(0);
  });
});
