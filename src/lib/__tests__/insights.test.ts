import { describe, expect, it } from "vitest";
import { addDays } from "../date";
import { computeInsights } from "../insights";
import type { InsightData } from "../insights";

const TODAY = "2026-10-06"; // a Tuesday
const back = (n: number) => addDays(TODAY, -n);
const empty: InsightData = { sleep: [], focus: [], trained: [], habitDays: [] };

describe("computeInsights", () => {
  it("says nothing with no data or too little of it", () => {
    expect(computeInsights(empty, TODAY)).toEqual([]);
    const few = { ...empty, sleep: [{ date: back(1), hours: 8 }, { date: back(2), hours: 5 }], focus: [{ date: back(1), minutes: 100 }] };
    expect(computeInsights(few, TODAY)).toEqual([]);
  });

  it("notices more focus after good sleep", () => {
    const sleep = [];
    const focus = [];
    for (let i = 1; i <= 24; i++) {
      const good = i % 2 === 0;
      sleep.push({ date: back(i), hours: good ? 8 : 5.5 });
      focus.push({ date: back(i), minutes: good ? 100 : 50 });
    }
    const out = computeInsights({ ...empty, sleep, focus }, TODAY);
    const hit = out.find((i) => i.id === "sleep-focus");
    expect(hit?.text).toContain("100 %");
    expect(hit?.text).toContain("7 h");
  });

  it("stays quiet when sleep makes no real difference", () => {
    const sleep = [];
    const focus = [];
    for (let i = 1; i <= 24; i++) {
      sleep.push({ date: back(i), hours: i % 2 ? 8 : 5.5 });
      focus.push({ date: back(i), minutes: 60 });
    }
    expect(computeInsights({ ...empty, sleep, focus }, TODAY)).toEqual([]);
  });

  it("notices training more after good sleep", () => {
    const sleep = [];
    const trained = [];
    for (let i = 1; i <= 24; i++) {
      const good = i % 2 === 0;
      sleep.push({ date: back(i), hours: good ? 8 : 5 });
      if (good && i % 4 !== 0) trained.push(back(i)); // 6 of 12 good nights
      if (!good && i === 1) trained.push(back(i)); // 1 of 12 short nights
    }
    const hit = computeInsights({ ...empty, sleep, trained }, TODAY).find((i) => i.id === "sleep-train");
    expect(hit?.text).toMatch(/50 %.*8 %/);
  });

  it("finds the weekday you actually train on", () => {
    const trained: string[] = [];
    for (let i = 0; i < 90; i++) if (new Date(back(i) + "T12:00:00").getDay() === 2) trained.push(back(i)); // Tuesdays
    const hit = computeInsights({ ...empty, trained }, TODAY).find((i) => i.id === "best-train-day");
    expect(hit?.text).toContain("martes");
  });

  it("returns at most three, strongest first", () => {
    const out = computeInsights({ ...empty, trained: Array.from({ length: 40 }, (_, i) => back(i * 2)) }, TODAY);
    expect(out.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < out.length; i++) expect(out[i - 1].strength).toBeGreaterThanOrEqual(out[i].strength);
  });
});
