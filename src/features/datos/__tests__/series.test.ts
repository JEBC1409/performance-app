import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/date";
import { loadChange, weeklyBest, windowSeries, withDeltas } from "../series";

const TODAY = "2026-10-27"; // a Tuesday

describe("windowSeries", () => {
  const daily = Array.from({ length: 400 }, (_, i) => ({ date: addDays(TODAY, -i), value: 70 + (i % 5) }));

  it("keeps only the days inside a 30 or 90 day window, oldest first", () => {
    const w30 = windowSeries(daily, 30, TODAY);
    expect(w30).toHaveLength(31);
    expect(w30[0].date < w30[w30.length - 1].date).toBe(true);
    expect(w30[0].date).toBe(addDays(TODAY, -30));
    expect(windowSeries(daily, 90, TODAY)).toHaveLength(91);
  });

  it("averages a year per week so it stays around 53 points", () => {
    const year = windowSeries(daily, 365, TODAY);
    expect(year.length).toBeLessThanOrEqual(54);
    expect(year.length).toBeGreaterThanOrEqual(52);
    // Every point is dated on a Monday
    year.forEach((p) => expect(new Date(p.date + "T00:00:00").getDay()).toBe(1));
  });

  it("averages the readings of one week and rounds to two decimals", () => {
    const pts = [
      { date: "2026-10-26", value: 70 },
      { date: "2026-10-27", value: 71 },
      { date: "2026-10-25", value: 72.333 }, // the Sunday before: previous week
    ];
    const out = windowSeries(pts, 365, TODAY);
    expect(out).toEqual([
      { date: "2026-10-19", value: 72.33 },
      { date: "2026-10-26", value: 70.5 },
    ]);
  });

  it("ignores readings after today and returns nothing for an empty log", () => {
    expect(windowSeries([{ date: "2026-11-02", value: 70 }], 30, TODAY)).toEqual([]);
    expect(windowSeries([], 90, TODAY)).toEqual([]);
  });
});

describe("weeklyBest", () => {
  const sets = [
    { date: "2026-10-05", weight: 40 }, // week of Oct 5
    { date: "2026-10-07", weight: 45 },
    { date: "2026-10-14", weight: 42.5 }, // week of Oct 12
    { date: "2026-10-26", weight: null }, // no weight: ignored
    { date: "2026-10-27", weight: 50 }, // week of Oct 26
  ];

  it("takes the heaviest set of each week, oldest first", () => {
    expect(weeklyBest(sets, undefined, 12)).toEqual([
      { weekStart: "2026-10-05", value: 45 },
      { weekStart: "2026-10-12", value: 42.5 },
      { weekStart: "2026-10-26", value: 50 },
    ]);
  });

  it("keeps only the last N weeks", () => {
    expect(weeklyBest(sets, undefined, 2).map((w) => w.weekStart)).toEqual(["2026-10-12", "2026-10-26"]);
  });

  it("counts the declared working weight for its week unless a heavier set exists", () => {
    const heavier = weeklyBest(sets, { kg: 60, asOf: "2026-10-28" }, 12);
    expect(heavier[heavier.length - 1]).toEqual({ weekStart: "2026-10-26", value: 60 });
    const lighter = weeklyBest(sets, { kg: 20, asOf: "2026-10-28" }, 12);
    expect(lighter[lighter.length - 1]).toEqual({ weekStart: "2026-10-26", value: 50 });
  });

  it("builds a week out of the working weight alone", () => {
    expect(weeklyBest([], { kg: 30, asOf: "2026-10-27" }, 12)).toEqual([{ weekStart: "2026-10-26", value: 30 }]);
  });
});

describe("loadChange", () => {
  const pts = [
    { weekStart: "2026-10-05", value: 40 },
    { weekStart: "2026-10-12", value: 42.5 },
    { weekStart: "2026-10-19", value: 45 },
  ];

  it("is last against first when there is no declared start", () => {
    expect(loadChange(pts)).toBe(5);
  });

  it("measures from the declared start week when it is in view", () => {
    expect(loadChange(pts, "2026-10-12")).toBe(2.5);
  });

  it("falls back to the first week when the start week is out of view", () => {
    expect(loadChange(pts, "2026-01-05")).toBe(5);
  });

  it("is null with a single week or when the start is the last week", () => {
    expect(loadChange([pts[0]])).toBeNull();
    expect(loadChange(pts, "2026-10-19")).toBeNull();
  });
});

describe("withDeltas", () => {
  it("skips empty entries and rounds each change to a tenth", () => {
    const out = withDeltas([
      { date: "2026-10-01", value: 98 },
      { date: "2026-10-08", value: null },
      { date: "2026-10-15", value: 98.6 },
      { date: "2026-10-22", value: 97.8 },
    ]);
    expect(out.map((r) => r.delta)).toEqual([null, 0.6, -0.8]);
    expect(out.map((r) => r.date)).toEqual(["2026-10-01", "2026-10-15", "2026-10-22"]);
  });
});
