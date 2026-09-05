import { describe, expect, it } from "vitest";
import { fromRemoteHabitDay } from "../cloudSync";

describe("fromRemoteHabitDay", () => {
  it("converts a migrated row (has `done`) normally", () => {
    expect(fromRemoteHabitDay({ date: "2026-09-05", done: ["sleep", "water"] })).toEqual({
      date: "2026-09-05",
      done: ["sleep", "water"],
    });
  });

  it("defaults a null `done` to an empty array", () => {
    expect(fromRemoteHabitDay({ date: "2026-09-05", done: null })).toEqual({ date: "2026-09-05", done: [] });
  });

  it("returns null for a pre-migration row with no `done` field at all — must not be read as an empty array", () => {
    // The shape habit_days had before supabase/migrations/0002_*: fixed
    // boolean columns, no `done`. Reading this as `done: []` and bulkPut-ing
    // it locally would silently erase whatever the user had actually marked
    // that day — this is the regression that shipped once already.
    expect(fromRemoteHabitDay({ date: "2026-09-05", sleep: true, water: false, meals: true, nophone: false })).toBeNull();
  });
});
