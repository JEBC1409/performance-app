import { describe, expect, it } from "vitest";
import { projectGoal, sanitizeGoal, weeklyPace } from "../weightGoal";

/** One weigh-in a week ending at `end`, from `start` kg by `perWeek` each week. */
function weekly(start: number, perWeek: number, weeks: number, endISO = "2026-10-01") {
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 1 - 7 * (weeks - 1 - i)));
    return { date: d.toISOString().slice(0, 10), kg: Math.round((start + perWeek * i) * 100) / 100 };
  }).map((p) => (endISO ? p : p));
}

describe("weeklyPace", () => {
  it("reads the real pace in kg per week", () => {
    expect(weeklyPace(weekly(80, -0.5, 4), "2026-10-01")).toBeCloseTo(-0.5, 2);
    expect(weeklyPace(weekly(70, 0.25, 4), "2026-10-01")).toBeCloseTo(0.25, 2);
  });

  it("won't guess from too little", () => {
    expect(weeklyPace(weekly(80, -0.5, 2), "2026-10-01")).toBeNull();
    expect(weeklyPace([{ date: "2026-10-01", kg: 80 }, { date: "2026-10-02", kg: 79.9 }, { date: "2026-10-03", kg: 79.8 }], "2026-10-03")).toBeNull();
  });
});

describe("projectGoal", () => {
  it("says on-track when your pace lands before the date", () => {
    const p = projectGoal(weekly(80, -0.5, 4), { targetKg: 76, byDate: "2026-12-31" }, "2026-10-01")!;
    expect(p.status).toBe("on-track");
    expect(p.remainingKg).toBeCloseTo(-2.5, 1); // 78.5 now, 76 to go
    expect(p.etaDate! <= "2026-12-31").toBe(true);
  });

  it("says behind, with the date you'd really arrive, when the pace is too slow", () => {
    const p = projectGoal(weekly(80, -0.1, 4), { targetKg: 75, byDate: "2026-11-01" }, "2026-10-01")!;
    expect(p.status).toBe("behind");
    expect(p.etaDate! > "2026-11-01").toBe(true);
    expect(p.neededPerWeek).toBeLessThan(p.pace!); // need to lose faster (more negative) than now
  });

  it("flags moving the wrong way", () => {
    expect(projectGoal(weekly(78, 0.4, 4), { targetKg: 75, byDate: "2026-12-31" }, "2026-10-01")!.status).toBe("wrong-way");
  });

  it("recognises a reached goal, a goal date that passed, and missing pace", () => {
    expect(projectGoal(weekly(75.2, -0.1, 4), { targetKg: 75, byDate: "2026-12-31" }, "2026-10-01")!.status).toBe("reached");
    expect(projectGoal(weekly(80, -0.1, 4), { targetKg: 75, byDate: "2026-09-01" }, "2026-10-01")!.status).toBe("expired");
    expect(projectGoal([{ date: "2026-10-01", kg: 80 }], { targetKg: 75, byDate: "2026-12-31" }, "2026-10-01")!.status).toBe("no-pace");
    expect(projectGoal([], { targetKg: 75, byDate: "2026-12-31" }, "2026-10-01")).toBeNull();
  });

  it("works for gaining too", () => {
    expect(projectGoal(weekly(70, 0.3, 4), { targetKg: 73, byDate: "2026-12-31" }, "2026-10-01")!.status).toBe("on-track");
  });
});

describe("sanitizeGoal", () => {
  it("accepts a sensible goal and rejects the rest", () => {
    expect(sanitizeGoal({ targetKg: 75.04, byDate: "2026-12-31" })).toEqual({ targetKg: 75, byDate: "2026-12-31" });
    expect(sanitizeGoal({ targetKg: 5, byDate: "2026-12-31" })).toBeNull();
    expect(sanitizeGoal({ targetKg: 75, byDate: "pronto" })).toBeNull();
    expect(sanitizeGoal("x")).toBeNull();
  });
});
