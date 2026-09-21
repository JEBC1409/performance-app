import { describe, expect, it } from "vitest";
import { delta, weekStats } from "../weeklySummary";
import type { WeekInput } from "../weeklySummary";

const empty: WeekInput = { sets: [], focus: [], habitDays: [], habitDefs: [], weights: [], sleep: [], moure: [] };
const W = "2026-09-14"; // a Monday
const defs = [
  { key: "biblia", label: "Biblia", icon: "circle" as const, order: 1 },
  { key: "moure", label: "MoureDev", icon: "square" as const, order: 0 },
];

describe("weekStats", () => {
  it("is all zeros / nulls for an empty week", () => {
    const s = weekStats(empty, W, "2026-09-20");
    expect(s).toMatchObject({ workouts: 0, sets: 0, volume: 0, focusBlocks: 0, activeDays: 0, sleepAvg: null, weightAvg: null, moureHours: null, habitPct: null });
    expect(s.activeByDay).toEqual(new Array(7).fill(false));
    expect(s.end).toBe("2026-09-20");
  });

  it("counts only rows inside the Monday-Sunday window", () => {
    const set = (date: string) => ({ id: 1, date, day: "A" as const, exercise: "x", setIndex: 1, weight: 10, reps: 10, toFailure: null, rpe: null, note: "", createdAt: 1 });
    const s = weekStats({ ...empty, sets: [set("2026-09-13"), set("2026-09-14"), set("2026-09-14"), set("2026-09-20"), set("2026-09-21")] }, W, "2026-09-20");
    expect(s.sets).toBe(3);
    expect(s.workouts).toBe(2);
    expect(s.volume).toBe(300);
  });

  it("totals Focus blocks and minutes, and the days they happened", () => {
    const f = (date: string, minutes: number) => ({ date, task: "t", minutes, createdAt: 1 });
    const s = weekStats({ ...empty, focus: [f("2026-09-15", 25), f("2026-09-15", 50), f("2026-09-17", 25)] }, W, "2026-09-20");
    expect(s).toMatchObject({ focusBlocks: 3, focusMinutes: 100, focusDays: 2 });
  });

  it("scores each habit by days done, in display order, against the days elapsed", () => {
    const days = [
      { date: "2026-09-14", done: ["moure", "biblia"] },
      { date: "2026-09-15", done: ["moure"] },
      { date: "2026-09-16", done: [] },
    ];
    const s = weekStats({ ...empty, habitDefs: defs, habitDays: days }, W, "2026-09-16"); // Wed: 3 days elapsed
    expect(s.habits).toEqual([
      { key: "moure", label: "MoureDev", days: 2 },
      { key: "biblia", label: "Biblia", days: 1 },
    ]);
    expect(s.elapsedDays).toBe(3);
    expect(s.habitPct).toBeCloseTo(3 / 6);
    expect(s.activeByDay.slice(0, 3)).toEqual([true, true, false]); // an empty day isn't "active"
  });

  it("averages sleep and weight, and sums MoureDev hours", () => {
    const s = weekStats(
      {
        ...empty,
        sleep: [
          { date: "2026-09-14", hours: 7, bedTime: "", wakeTime: "", note: "" },
          { date: "2026-09-15", hours: 8, bedTime: "", wakeTime: "", note: "" },
        ],
        weights: [
          { date: "2026-09-14", weightKg: 72, pechoCm: null, brazoCm: null, note: "" },
          { date: "2026-09-19", weightKg: 73, pechoCm: null, brazoCm: null, note: "" },
        ],
        moure: [{ week: 3, date: "2026-09-16", topic: "", hours: 6, project: "", done: true }],
      },
      W,
      "2026-09-20",
    );
    expect(s).toMatchObject({ sleepAvg: 7.5, sleepNights: 2, weightAvg: 72.5, weightLast: 73, moureHours: 6 });
  });

  it("a week that hasn't started has no elapsed days", () => {
    expect(weekStats({ ...empty, habitDefs: defs }, "2026-09-28", "2026-09-20")).toMatchObject({ elapsedDays: 0, habitPct: null });
  });
});

describe("delta", () => {
  it("compares with the previous week", () => {
    expect(delta(5, 3)).toEqual({ diff: 2, dir: "up" });
    expect(delta(3, 5)).toEqual({ diff: -2, dir: "down" });
    expect(delta(4, 4)).toEqual({ diff: 0, dir: "flat" });
    expect(delta(7.2, 7.1, 0.25)?.dir).toBe("flat");
  });
  it("is null when either side is missing", () => {
    expect(delta(null, 3)).toBeNull();
    expect(delta(3, null)).toBeNull();
  });
});
