import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { addDays, todayISO } from "../date";
import { activeDaysCount, totalActiveDays } from "../dailyScore";

const TODAY = todayISO();
const set = (date: string, day: "A" | "B" | "C" = "A") => ({ date, day, exercise: "X", setIndex: 1, weight: 10, reps: 5, toFailure: null, rpe: null, note: "", createdAt: Date.now() });

beforeEach(async () => {
  await Promise.all([db.sets.clear(), db.habitDays.clear(), db.weights.clear(), db.sleep.clear(), db.focusSessions.clear()]);
});

describe("totalActiveDays", () => {
  it("counts each calendar day once, whatever was logged on it, across all five sources", async () => {
    const d = (n: number) => addDays(TODAY, -n);
    await db.sets.bulkAdd([set(d(10)), set(d(10)), set(d(10), "B"), set(d(9))]); // 2 days, many rows
    await db.weights.add({ date: d(9), weightKg: 80 } as never); // same day as a workout
    await db.sleep.add({ date: d(8), hours: 7 } as never);
    await db.focusSessions.add({ date: d(7), task: "t", minutes: 25, createdAt: 1 });
    await db.habitDays.bulkAdd([
      { date: d(6), done: ["agua"] },
      { date: d(5), done: [] }, // nothing marked: not an active day
    ] as never);
    await db.sets.add(set(TODAY)); // today
    expect(await totalActiveDays()).toBe(6); // d10, d9, d8, d7, d6, today
  });

  it("past and from-today counts are separate and add up", async () => {
    await db.sets.bulkAdd([set(addDays(TODAY, -3)), set(addDays(TODAY, -2)), set(TODAY)]);
    expect(await activeDaysCount("before", TODAY)).toBe(2);
    expect(await activeDaysCount("from", TODAY)).toBe(1);
    expect(await totalActiveDays()).toBe(3);
  });

  it("is zero with no data", async () => {
    expect(await totalActiveDays()).toBe(0);
  });
});
