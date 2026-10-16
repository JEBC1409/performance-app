import { describe, expect, it } from "vitest";
import { addDays } from "../date";
import { computeInsights } from "../insights";
import { KEEP_DAYS, sanitizeMood, withMood } from "../mood";

const TODAY = "2026-10-14";

describe("mood log", () => {
  it("cleans stored data", () => {
    expect(sanitizeMood({ "2026-10-14": 4, "2026-10-13": 9, bad: 3, "2026-10-12": 2.5 })).toEqual({ "2026-10-14": 4 });
    expect(sanitizeMood(null)).toEqual({});
  });

  it("sets, clears and forgets very old days", () => {
    const old = addDays(TODAY, -(KEEP_DAYS + 5));
    const m = withMood({ [old]: 3 }, TODAY, 4, TODAY);
    expect(m).toEqual({ [TODAY]: 4 });
    expect(withMood(m, TODAY, null, TODAY)).toEqual({});
    expect(withMood({}, TODAY, 9, TODAY)).toEqual({});
  });
});

describe("mood insights", () => {
  function data(goodMood: number, shortMood: number) {
    const sleep: { date: string; hours: number }[] = [];
    const mood: { date: string; value: number }[] = [];
    for (let i = 1; i <= 16; i++) {
      const date = addDays(TODAY, -i);
      const good = i % 2 === 0;
      sleep.push({ date, hours: good ? 8 : 5.5 });
      mood.push({ date, value: good ? goodMood : shortMood });
    }
    return { sleep, focus: [], trained: [] as string[], habitDays: [], mood };
  }

  it("notices a better mood after good sleep", () => {
    const out = computeInsights(data(4.5, 3), TODAY);
    expect(out.find((i) => i.id === "sleep-mood")?.text).toMatch(/4,5 contra 3/);
  });

  it("stays quiet when there is no real gap or too little data", () => {
    expect(computeInsights(data(4, 3.8), TODAY).some((i) => i.id === "sleep-mood")).toBe(false);
    const few = data(5, 2);
    few.mood = few.mood.slice(0, 5);
    expect(computeInsights(few, TODAY).some((i) => i.id === "sleep-mood")).toBe(false);
  });

  it("notices a better mood on training days", () => {
    const d = data(3, 3);
    d.trained = d.mood.filter((_, i) => i % 3 === 0).map((m) => m.date);
    d.mood = d.mood.map((m) => ({ ...m, value: d.trained.includes(m.date) ? 4.5 : 3 }));
    expect(computeInsights(d, TODAY).some((i) => i.id === "train-mood")).toBe(true);
  });
});
