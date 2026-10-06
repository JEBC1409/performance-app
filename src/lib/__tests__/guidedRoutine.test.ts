import { describe, expect, it } from "vitest";
import { RUTINA_MATUTINA } from "@/data/gym";
import { buildSteps, holdSeconds, routineHabit, sanitizeDays, withDay } from "../guidedRoutine";

describe("holdSeconds", () => {
  it("uses the longer end of a timed range and ignores rep-based loads", () => {
    expect(holdSeconds("20-30 seg")).toBe(30);
    expect(holdSeconds("30-45 seg")).toBe(45);
    expect(holdSeconds("8-10/lado")).toBeNull();
    expect(holdSeconds("10/lado")).toBeNull();
  });
});

describe("buildSteps", () => {
  it("lays the real routine out as one step per set, in order", () => {
    const steps = buildSteps(RUTINA_MATUTINA);
    expect(steps).toHaveLength(RUTINA_MATUTINA.reduce((a, r) => a + r.series, 0));
    expect(steps[0]).toMatchObject({ exercise: "Stomach vacuums", setNo: 1, setsTotal: 5, holdSec: 30 });
    expect(steps[4]).toMatchObject({ exercise: "Stomach vacuums", setNo: 5 });
    expect(steps[5]).toMatchObject({ exercise: "Plancha frontal", setNo: 1 });
    const dead = steps.find((s) => s.exercise === "Dead bug")!;
    expect(dead.holdSec).toBeNull();
  });
});

describe("routine days", () => {
  it("keeps days unique and sorted, and drops junk", () => {
    expect(sanitizeDays(null)).toEqual([]);
    expect(sanitizeDays({ days: ["2026-10-02", "x", 5, "2026-10-01", "2026-10-02"] })).toEqual(["2026-10-01", "2026-10-02"]);
    expect(withDay(["2026-10-01"], "2026-10-01")).toEqual(["2026-10-01"]);
    expect(withDay(["2026-10-01"], "2026-10-03")).toEqual(["2026-10-01", "2026-10-03"]);
  });

  it("finds the habit it should tick", () => {
    expect(routineHabit([{ label: "Agua 2L+" }, { label: "Rutina de ayunas" }])?.label).toBe("Rutina de ayunas");
    expect(routineHabit([{ label: "Agua 2L+" }])).toBeUndefined();
  });
});
