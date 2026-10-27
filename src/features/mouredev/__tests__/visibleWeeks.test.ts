import { describe, expect, it } from "vitest";
import { visibleWeekNumbers } from "../visibleWeeks";

const week = (n: number, extra: Record<string, unknown> = {}) => ({ week: n, done: false, date: "", topic: "", project: "", hours: null as number | null, focusHours: 0, ...extra });

describe("visibleWeekNumbers", () => {
  it("shows the finished weeks plus the next one", () => {
    const weeks = [week(1, { done: true }), week(2, { done: true }), week(3), week(4), week(5)];
    expect([...visibleWeekNumbers(weeks)]).toEqual([1, 2, 3]);
  });

  it("keeps a later week that already has something written in it", () => {
    const weeks = [week(1, { done: true }), week(2), week(3), week(4, { topic: "Clases" }), week(5, { hours: 0 }), week(6, { focusHours: 2 })];
    expect([...visibleWeekNumbers(weeks)].sort()).toEqual([1, 2, 4, 5, 6]);
  });

  it("with everything done there is no 'next' week", () => {
    expect([...visibleWeekNumbers([week(1, { done: true }), week(2, { done: true })])]).toEqual([1, 2]);
  });

  it("with nothing done, starts at week 1", () => {
    expect([...visibleWeekNumbers([week(1), week(2), week(3)])]).toEqual([1]);
  });
});
