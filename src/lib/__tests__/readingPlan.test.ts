import { describe, expect, it } from "vitest";
import rawBible from "../../../public/bible/rvr1909.json";
import { CHAPTER_COUNTS } from "@/data/bible/chapterCounts";
import { chapterKey, chaptersDueBy, newPlan, planChapters, planDayNumber, planIncludes, planProgress, sanitizePlan, toggleRead } from "../readingPlan";

describe("chapter counts", () => {
  it("match the Bible file the app actually reads", () => {
    const bible = rawBible as { abbrev: string; chapters: unknown[] }[];
    expect(Object.keys(CHAPTER_COUNTS).length).toBe(bible.length);
    for (const b of bible) expect(CHAPTER_COUNTS[b.abbrev], b.abbrev).toBe(b.chapters.length);
  });
});

describe("planChapters", () => {
  it("lists each plan's chapters in reading order", () => {
    expect(planChapters("marcos")).toHaveLength(16);
    expect(planChapters("marcos")[0].key).toBe("mk:1");
    expect(planChapters("evangelios")).toHaveLength(28 + 16 + 24 + 21);
    expect(planChapters("nt")).toHaveLength(260);
    expect(planChapters("biblia")).toHaveLength(1189);
    expect(planChapters("nope")).toEqual([]);
  });
});

describe("chaptersDueBy", () => {
  it("spreads chapters evenly and always finishes on the last day", () => {
    expect(chaptersDueBy(16, 16, 1)).toBe(1);
    expect(chaptersDueBy(89, 30, 1)).toBe(3);
    expect(chaptersDueBy(89, 30, 30)).toBe(89);
    expect(chaptersDueBy(10, 30, 1)).toBe(1);
  });
});

describe("planProgress", () => {
  const start = "2026-10-01";

  it("hands out one chapter a day on a 16-day Marcos plan", () => {
    const plan = newPlan("marcos", 16, start)!;
    const p = planProgress(plan, "2026-10-01");
    expect(p.dayNumber).toBe(1);
    expect(p.today.map((c) => c.key)).toEqual(["mk:1"]);
    expect(p.behind).toBe(0);
  });

  it("rolls a missed day into the next one instead of leaving a hole", () => {
    const plan = newPlan("marcos", 16, start)!;
    const p = planProgress(plan, "2026-10-03"); // day 3, nothing read yet
    expect(p.today.map((c) => c.key)).toEqual(["mk:1", "mk:2", "mk:3"]);
    expect(p.behind).toBe(2);
  });

  it("is caught up once today's chapter is ticked, and offers the next to read ahead", () => {
    let plan = newPlan("marcos", 16, start)!;
    plan = toggleRead(plan, "mk:1");
    plan = toggleRead(plan, "mk:2");
    const p = planProgress(plan, "2026-10-02");
    expect(p.today).toEqual([]);
    expect(p.nextUnread?.key).toBe("mk:3");
  });

  it("takes a chapter read out of order out of the pile without confusing the rest", () => {
    let plan = newPlan("marcos", 16, start)!;
    plan = toggleRead(plan, "mk:5");
    const p = planProgress(plan, "2026-10-02");
    expect(p.doneCount).toBe(1);
    expect(p.today.map((c) => c.key)).toEqual(["mk:1"]); // owes 2, has 1 → one more, the earliest unread
  });

  it("clamps after the end and reports the plan finished once everything is read", () => {
    let plan = newPlan("marcos", 4, start)!;
    expect(planDayNumber(plan, "2027-03-01")).toBe(4);
    for (const c of planChapters("marcos")) plan = toggleRead(plan, c.key);
    expect(planProgress(plan, "2027-03-01").finished).toBe(true);
  });

  it("can un-tick a chapter", () => {
    const plan = toggleRead(toggleRead(newPlan("marcos", 16, start)!, "mk:1"), "mk:1");
    expect(plan.done).toEqual([]);
  });
});

describe("sanitizePlan / planIncludes", () => {
  it("rejects junk and keeps good data", () => {
    expect(sanitizePlan(null)).toBeNull();
    expect(sanitizePlan({ planId: "nope", days: 10, startDate: "2026-10-01" })).toBeNull();
    expect(sanitizePlan({ planId: "marcos", days: 0, startDate: "2026-10-01" })).toBeNull();
    expect(sanitizePlan({ planId: "marcos", days: 16, startDate: "ayer" })).toBeNull();
    expect(sanitizePlan({ planId: "marcos", days: 16, startDate: "2026-10-01", done: ["mk:1", "mk:1", 7] })).toEqual({ planId: "marcos", days: 16, startDate: "2026-10-01", done: ["mk:1"] });
  });

  it("knows which chapters belong to the plan", () => {
    const plan = newPlan("marcos", 16, "2026-10-01")!;
    expect(planIncludes(plan, "mk", 16)).toBe(true);
    expect(planIncludes(plan, "mk", 17)).toBe(false);
    expect(planIncludes(plan, "jo", 1)).toBe(false);
    expect(chapterKey("mk", 3)).toBe("mk:3");
  });
});
