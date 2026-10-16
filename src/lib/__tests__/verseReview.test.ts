import { describe, expect, it } from "vitest";
import { INTERVALS, dueKeys, gradeReview, sanitizeReview, startReview, stopReview } from "../verseReview";

describe("verse review", () => {
  it("a new verse is due today, once", () => {
    const a = startReview({}, "jo.3.16", "2026-10-14");
    expect(a).toEqual({ "jo.3.16": { step: 0, due: "2026-10-14" } });
    expect(startReview(a, "jo.3.16", "2026-11-01")).toBe(a);
    expect(dueKeys(a, "2026-10-14")).toEqual(["jo.3.16"]);
    expect(dueKeys(a, "2026-10-13")).toEqual([]);
  });

  it("each success pushes it further out; a miss starts over tomorrow", () => {
    let s = startReview({}, "ps.23.1", "2026-10-14");
    const gaps: number[] = [];
    let day = "2026-10-14";
    for (let i = 0; i < 4; i++) {
      s = gradeReview(s, "ps.23.1", true, day);
      const due = s["ps.23.1"].due;
      gaps.push((Date.parse(due) - Date.parse(day)) / 86_400_000);
      day = due;
    }
    expect(gaps).toEqual(INTERVALS.slice(0, 4));

    const missed = gradeReview(s, "ps.23.1", false, day);
    expect(missed["ps.23.1"].step).toBe(0);
    expect((Date.parse(missed["ps.23.1"].due) - Date.parse(day)) / 86_400_000).toBe(1);
  });

  it("caps at the longest gap and ignores unknown verses", () => {
    let s = startReview({}, "a.1.1", "2026-01-01");
    for (let i = 0; i < 12; i++) s = gradeReview(s, "a.1.1", true, s["a.1.1"].due);
    expect(s["a.1.1"].step).toBe(12);
    const last = INTERVALS[INTERVALS.length - 1];
    const before = s["a.1.1"].due;
    const after = gradeReview(s, "a.1.1", true, before)["a.1.1"].due;
    expect((Date.parse(after) - Date.parse(before)) / 86_400_000).toBe(last);
    expect(gradeReview({}, "x.1.1", true, "2026-01-01")).toEqual({});
  });

  it("lists the most overdue first, and can drop a verse", () => {
    const s = { "b.1.1": { step: 1, due: "2026-10-10" }, "a.1.1": { step: 0, due: "2026-10-12" }, "c.1.1": { step: 2, due: "2026-10-20" } };
    expect(dueKeys(s, "2026-10-14")).toEqual(["b.1.1", "a.1.1"]);
    expect(stopReview(s, "b.1.1")["b.1.1"]).toBeUndefined();
    expect(stopReview(s, "zzz.1.1")).toBe(s);
  });

  it("cleans stored data", () => {
    expect(sanitizeReview({ "jo.3.16": { step: 2, due: "2026-10-14" }, bad: { step: 1, due: "2026-10-14" }, "jo.3.17": { step: -1, due: "2026-10-14" }, "jo.3.18": { step: 1, due: "mañana" } })).toEqual({ "jo.3.16": { step: 2, due: "2026-10-14" } });
    expect(sanitizeReview(null)).toEqual({});
  });
});
