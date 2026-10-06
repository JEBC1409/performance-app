import { describe, expect, it } from "vitest";
import { detectStall, sessionScores, stallAdvice } from "../stagnation";

const sets = (rows: [string, number | null, number][]) => rows.map(([date, weight, reps]) => ({ date, weight, reps }));

describe("sessionScores", () => {
  it("keeps each session's best estimated max, one per date, oldest first", () => {
    const s = sessionScores(sets([["2026-10-02", 40, 8], ["2026-10-01", 30, 10], ["2026-10-01", 35, 6]]));
    expect(s.map((x) => x.date)).toEqual(["2026-10-01", "2026-10-02"]);
    expect(s[0].topWeight).toBe(35);
    expect(s[1].score).toBeCloseTo(40 * (1 + 8 / 30), 5);
  });

  it("leaves out the session being logged, and empty sets", () => {
    const s = sessionScores(sets([["2026-10-01", 30, 10], ["2026-10-02", 40, 8], ["2026-10-02", 40, 0]]), "2026-10-02");
    expect(s.map((x) => x.date)).toEqual(["2026-10-01"]);
  });

  it("scores bodyweight work by reps", () => {
    expect(sessionScores(sets([["2026-10-01", null, 12]]))[0]).toMatchObject({ score: 12, topWeight: null });
  });
});

describe("detectStall", () => {
  const run = (weights: number[]) => sessionScores(sets(weights.map((w, i) => [`2026-09-${String(i + 1).padStart(2, "0")}`, w, 8] as [string, number, number])));

  it("flags three sessions in a row that never beat the earlier best", () => {
    expect(detectStall(run([40, 42.5, 45, 45, 45, 42.5]))).toMatchObject({ sessions: 3, topWeight: 42.5 });
  });

  it("is quiet while the weight is still going up, or when one recent session improved", () => {
    expect(detectStall(run([40, 42.5, 45, 47.5, 50, 52.5]))).toBeNull();
    expect(detectStall(run([40, 42.5, 42.5, 42.5, 45]))).toBeNull();
  });

  it("needs enough history to judge", () => {
    expect(detectStall(run([40, 40, 40]))).toBeNull();
    expect(detectStall([])).toBeNull();
  });

  it("does not count a rounding-error gain as progress", () => {
    expect(detectStall(run([40, 45, 45.1, 45, 45]))).not.toBeNull();
  });
});

describe("stallAdvice", () => {
  it("suggests a lighter weight for loaded work and a variation for bodyweight", () => {
    expect(stallAdvice({ sessions: 3, topWeight: 50 })).toContain("45 kg");
    expect(stallAdvice({ sessions: 3, topWeight: null })).toContain("variante");
  });
});
