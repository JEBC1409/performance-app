import { afterEach, describe, expect, it } from "vitest";
import { addRest, completeRestIfDue, getRestState, restRemaining, skipRest, startRest } from "../restTimer";

afterEach(() => skipRest());

describe("rest timer", () => {
  it("counts from an end time, so time that passes while the page is frozen still counts", () => {
    startRest(90, 1_000_000);
    const s = getRestState();
    expect(restRemaining(s, 1_000_000)).toBe(90);
    // no ticks happened, but 40 s went by (app in the background):
    expect(restRemaining(s, 1_040_000)).toBe(50);
    // and rounds up so it never shows 0:00 before it is over
    expect(restRemaining(s, 1_089_500)).toBe(1);
    expect(restRemaining(s, 1_090_000)).toBe(0);
  });

  it("+30s pushes the end out and grows the total", () => {
    startRest(60, 2_000_000);
    addRest(30, 2_010_000);
    const s = getRestState();
    expect(s.total).toBe(90);
    expect(restRemaining(s, 2_010_000)).toBe(80);
  });

  it("completes once, reporting how late it was noticed", () => {
    startRest(30, 3_000_000);
    expect(completeRestIfDue(3_020_000)).toBeNull();
    expect(completeRestIfDue(3_100_000)).toEqual({ lateBySec: 70 });
    expect(getRestState().endAt).toBeNull();
    expect(completeRestIfDue(3_200_000)).toBeNull();
  });

  it("is saved, so it survives a reload", () => {
    startRest(120);
    const saved = JSON.parse(localStorage.getItem("performance_rest_timer_v1") ?? "null") as { endAt: number; total: number };
    expect(saved.total).toBe(120);
    expect(saved.endAt).toBeGreaterThan(Date.now());
    skipRest();
    expect(localStorage.getItem("performance_rest_timer_v1")).toBeNull();
  });

  it("ignores a non-positive length and an add with nothing running", () => {
    startRest(0);
    expect(getRestState().endAt).toBeNull();
    addRest(30);
    expect(getRestState().endAt).toBeNull();
  });
});
