import { describe, expect, it } from "vitest";
import { readyToIncrease } from "../readyUp";

const set = (date: string, weight: number | null, reps: number | null) => ({ date, weight, reps });

describe("readyToIncrease", () => {
  it("says to add weight when every working set hit the top of the range last time", () => {
    const sets = [set("2026-10-01", 40, 12), set("2026-10-01", 40, 12), set("2026-10-01", 40, 12)];
    const r = readyToIncrease("10-12", sets, "2026-10-08");
    expect(r?.kind).toBe("increase");
    expect(r?.weight).toBe(42);
    expect(r?.reps).toBe(10);
  });

  it("looks only at the most recent session", () => {
    const sets = [set("2026-09-20", 40, 12), set("2026-10-01", 40, 9), set("2026-10-01", 40, 8)];
    expect(readyToIncrease("10-12", sets, "2026-10-08")).toBeNull();
  });

  it("ignores today's and later sessions", () => {
    const sets = [set("2026-10-08", 40, 12), set("2026-10-08", 40, 12)];
    expect(readyToIncrease("10-12", sets, "2026-10-08")).toBeNull();
  });

  it("does not count sessions older than the starting weight", () => {
    const sets = [set("2026-09-10", 40, 12), set("2026-09-10", 40, 12)];
    expect(readyToIncrease("10-12", sets, "2026-10-08", "2026-09-21")).toBeNull();
    expect(readyToIncrease("10-12", sets, "2026-10-08", "2026-09-01")).not.toBeNull();
  });

  it("never fires for work taken to failure, with no history, or with no sets", () => {
    expect(readyToIncrease("al fallo", [set("2026-10-01", 40, 20)], "2026-10-08")).toBeNull();
    expect(readyToIncrease("10-12", [], "2026-10-08")).toBeNull();
  });
});
