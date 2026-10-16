import { describe, expect, it } from "vitest";
import { weekTip } from "../weekTip";
import type { WeekStats } from "../weeklySummary";

const base: WeekStats = {
  start: "2026-10-05",
  end: "2026-10-11",
  elapsedDays: 7,
  activeByDay: [true, true, true, true, true, true, true],
  activeDays: 7,
  workouts: 4,
  sets: 80,
  volume: 20000,
  focusBlocks: 10,
  focusMinutes: 300,
  focusDays: 5,
  habits: [
    { key: "agua", label: "Agua 2L+", days: 6 },
    { key: "moure", label: "MoureDev", days: 2 },
  ],
  habitPct: 0.8,
  sleepAvg: 7.5,
  sleepNights: 6,
  weightAvg: null,
  weightLast: null,
  moureHours: null,
};
const w = (patch: Partial<WeekStats>): WeekStats => ({ ...base, ...patch });

describe("weekTip", () => {
  it("praises a solid week", () => {
    expect(weekTip(base, base)).toMatch(/Semana sólida/);
  });

  it("flags short sleep first, with the average", () => {
    expect(weekTip(w({ sleepAvg: 6.2, workouts: 1 }), base)).toMatch(/6\.2 h/);
  });

  it("names the weakest habit when habits are low", () => {
    expect(weekTip(w({ habitPct: 0.4 }), base)).toMatch(/MoureDev/);
  });

  it("asks for more training when there were fewer than three sessions", () => {
    expect(weekTip(w({ workouts: 2 }), base)).toMatch(/2 veces/);
    expect(weekTip(w({ workouts: 1 }), base)).toMatch(/1 vez/);
  });

  it("notices a drop in focus time", () => {
    expect(weekTip(w({ focusMinutes: 120 }), base)).toMatch(/Focus bajó/);
  });

  it("does not judge a week that has barely started, or sleep from too few nights", () => {
    expect(weekTip(w({ elapsedDays: 2, sleepAvg: 5 }), base)).toMatch(/pronto/);
    expect(weekTip(w({ sleepAvg: 5, sleepNights: 1 }), base)).toMatch(/Semana sólida/);
  });
});
