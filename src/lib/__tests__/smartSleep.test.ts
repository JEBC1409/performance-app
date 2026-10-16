import { describe, expect, it } from "vitest";
import { bedtimeFor, fmtHHMM, tonightBedtime, wakeMinutes } from "../smartSleep";

const cell = (text: string, cont = false) => ({ text, type: "otro" as const, cont });
const rows = [
  { time: "5:00", cells: [cell("Levantarse, bañarse"), cell("Despertar + aseo"), cell("")] },
  { time: "6:00-7:30", cells: [cell("Clase"), cell("Clase"), cell("Despertar 7:00")] },
] as unknown as Parameters<typeof wakeMinutes>[1];

describe("smart bedtime", () => {
  it("finds the wake-up block of a column from its row's start time", () => {
    expect(wakeMinutes(0, rows)).toBe(300);
    expect(wakeMinutes(1, rows)).toBe(300);
    expect(wakeMinutes(2, rows)).toBe(360);
    expect(wakeMinutes(5, rows)).toBeNull();
  });

  it("subtracts the sleep goal, wrapping past midnight", () => {
    expect(fmtHHMM(bedtimeFor(300, 7.5))).toBe("21:30");
    expect(fmtHHMM(bedtimeFor(360, 8))).toBe("22:00");
    expect(fmtHHMM(bedtimeFor(60, 8))).toBe("17:00");
    expect(fmtHHMM(bedtimeFor(540, 7.5))).toBe("01:30");
  });

  it("works out tonight from tomorrow's wake-up", () => {
    // Sunday 2026-10-11 → tomorrow is Monday (column 0): wake 5:00
    expect(tonightBedtime(new Date("2026-10-11T12:00:00"), rows, 7.5)).toEqual({ bedtime: "21:30", wake: "05:00" });
    // Friday → Saturday is column 5, no wake-up block in this schedule
    expect(tonightBedtime(new Date("2026-10-16T12:00:00"), rows, 7.5)).toBeNull();
  });

  it("the real schedule has a wake-up block for Monday", () => {
    expect(tonightBedtime(new Date("2026-10-11T12:00:00"))).not.toBeNull();
  });
});
