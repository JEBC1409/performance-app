import { describe, expect, it } from "vitest";
import { addDays, startOfWeek } from "../date";
import { DELOAD_AFTER_WEEKS, deloadDue, trainingWeeksInARow } from "../deload";

const TODAY = "2026-10-14"; // a Wednesday
const monday = startOfWeek(TODAY);

/** Two session days in each of the `n` weeks before this one (and this one too when `current`). */
function weeks(n: number, current = false): string[] {
  const out: string[] = [];
  for (let i = current ? 0 : 1; i <= (current ? n - 1 : n); i++) {
    const wk = addDays(monday, -7 * i);
    out.push(wk, addDays(wk, 2));
  }
  return out;
}

describe("trainingWeeksInARow", () => {
  it("counts completed weeks and skips an unfinished current one", () => {
    expect(trainingWeeksInARow(weeks(5), TODAY)).toBe(5);
  });

  it("includes the current week once it already has two sessions", () => {
    expect(trainingWeeksInARow(weeks(5, true), TODAY)).toBe(5);
    expect(trainingWeeksInARow([...weeks(5), monday, addDays(monday, 1)], TODAY)).toBe(6);
  });

  it("stops at a week with fewer than two sessions", () => {
    const gap = addDays(monday, -21);
    const dates = weeks(8).filter((d) => startOfWeek(d) !== gap || d === gap); // one session in that week
    expect(trainingWeeksInARow(dates, TODAY)).toBe(2);
  });

  it("does not count weeks up to the last deload", () => {
    expect(trainingWeeksInARow(weeks(8), TODAY, addDays(monday, -28))).toBe(3);
  });
});

describe("deloadDue", () => {
  it("is due after the configured streak, and not before", () => {
    expect(deloadDue(weeks(DELOAD_AFTER_WEEKS - 1), TODAY, {})).toBeNull();
    expect(deloadDue(weeks(DELOAD_AFTER_WEEKS), TODAY, {})).toBe(DELOAD_AFTER_WEEKS);
  });

  it("stays quiet while snoozed or just after a deload", () => {
    expect(deloadDue(weeks(8), TODAY, { snoozeUntil: addDays(TODAY, 3) })).toBeNull();
    expect(deloadDue(weeks(8), TODAY, { snoozeUntil: addDays(TODAY, -1) })).toBe(8);
    expect(deloadDue(weeks(8), TODAY, { doneAt: addDays(TODAY, -2) })).toBeNull();
  });
});
