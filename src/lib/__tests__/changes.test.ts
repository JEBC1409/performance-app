import { describe, expect, it } from "vitest";
import { changeOver, valueOnOrBefore, windowAverage, windowChange } from "../changes";

const TODAY = "2026-10-17";
const p = (date: string, value: number) => ({ date, value });

describe("changeOver", () => {
  const pts = [p("2026-09-10", 70), p("2026-09-19", 71), p("2026-10-10", 72), p("2026-10-17", 72.6)];
  it("compares the latest value with the last one on or before N days ago", () => {
    expect(changeOver(pts, 7, TODAY)).toEqual({ from: 72, to: 72.6, diff: 0.6 });
    // 30 days before is 09-17: the last reading on or before it is 09-10, not 09-19
    expect(changeOver(pts, 30, TODAY)).toEqual({ from: 70, to: 72.6, diff: 2.6 });
  });
  it("is null when nothing is old enough, or the only point is the latest", () => {
    expect(changeOver([p("2026-10-16", 80), p("2026-10-17", 81)], 7, TODAY)).toBeNull();
    expect(changeOver([p("2026-10-17", 81)], 7, TODAY)).toBeNull();
    expect(changeOver([], 7, TODAY)).toBeNull();
  });
  it("ignores values dated after today", () => {
    expect(valueOnOrBefore([p("2026-10-20", 99), p("2026-10-01", 70)], TODAY)).toEqual(p("2026-10-01", 70));
  });
});

describe("windowChange / windowAverage", () => {
  const sleep = [p("2026-10-04", 6), p("2026-10-08", 6.5), p("2026-10-11", 7), p("2026-10-14", 8), p("2026-10-17", 7.5)];
  it("averages the last 7 days against the 7 before", () => {
    // current window 2026-10-11..17 → 7, 8, 7.5 ; previous 10-04..10 → 6, 6.5
    expect(windowChange(sleep, 7, TODAY)).toEqual({ current: 7.5, previous: 6.3, diff: 1.2, currentCount: 3 });
  });
  it("needs data in both windows", () => {
    expect(windowChange([p("2026-10-15", 7)], 7, TODAY)).toBeNull();
    expect(windowChange([p("2026-10-01", 7)], 7, TODAY)).toBeNull();
  });
  it("gives the plain recent average", () => {
    expect(windowAverage(sleep, 7, TODAY)).toBe(7.5);
    expect(windowAverage(sleep, 3, TODAY)).toBe(7.5);
    expect(windowAverage([p("2026-09-01", 5)], 7, TODAY)).toBeNull();
  });
});
