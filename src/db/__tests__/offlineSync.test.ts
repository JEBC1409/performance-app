import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** A stand-in for the Supabase client, just enough for fullSync. */
const remote: Record<string, Record<string, unknown>[]> = {};
const upsertError = { current: null as string | null };
const upserts: { table: string; row: unknown }[] = [];

vi.mock("@/lib/supabase", () => {
  const from = (table: string) => ({
    select: () => {
      const q = Promise.resolve({ data: remote[table] ?? [], error: null }) as Promise<unknown> & { maybeSingle: () => Promise<unknown> };
      q.maybeSingle = () => Promise.resolve({ data: remote[table]?.[0] ?? null, error: null });
      return q;
    },
    upsert: (row: unknown) => {
      upserts.push({ table, row });
      if (!upsertError.current) {
        // A successful upsert updates the "cloud", like the real thing.
        const r = row as { date?: string };
        remote[table] = [...(remote[table] ?? []).filter((x) => x.date !== r.date), row as Record<string, unknown>];
      }
      return Promise.resolve({ error: upsertError.current ? { message: upsertError.current } : null });
    },
    delete: () => ({ match: () => Promise.resolve({ error: null }) }),
  });
  return { supabase: { from }, supabaseConfigured: true };
});

const { db } = await import("../db");
const { fullSync } = await import("../cloudSync");
const { enqueue } = await import("../outbox");

const U = "user-1";

beforeEach(async () => {
  await Promise.all([db.habitDays.clear(), db.outbox.clear(), db.settings.clear()]);
  Object.keys(remote).forEach((k) => delete remote[k]);
  upsertError.current = null;
  upserts.length = 0;
});

describe("sync with offline changes", () => {
  it("uploads changes made offline before pulling, so the cloud copy can't overwrite them", async () => {
    await db.habitDays.put({ date: "2026-09-05", done: ["sleep", "water"] });
    await enqueue({ table: "habit_days", key: "2026-09-05", op: "upsert", userId: U, payload: { user_id: U, date: "2026-09-05", done: ["sleep", "water"] } });
    remote.habit_days = [{ date: "2026-09-05", done: ["sleep"] }]; // older cloud copy

    await fullSync(U);

    expect(upserts.some((u) => u.table === "habit_days")).toBe(true);
    expect(await db.outbox.count()).toBe(0);
    expect((await db.habitDays.get("2026-09-05"))?.done).toEqual(["sleep", "water"]);
  });

  it("if that upload fails, the pull still leaves the unsent local edit alone", async () => {
    upsertError.current = "permission denied for table habit_days";
    await db.habitDays.put({ date: "2026-09-05", done: ["sleep", "water"] });
    await enqueue({ table: "habit_days", key: "2026-09-05", op: "upsert", userId: U, payload: { user_id: U, date: "2026-09-05", done: ["sleep", "water"] } });
    remote.habit_days = [
      { date: "2026-09-05", done: ["sleep"] },
      { date: "2026-09-04", done: ["water"] },
    ];

    await fullSync(U);

    expect((await db.habitDays.get("2026-09-05"))?.done).toEqual(["sleep", "water"]); // kept
    expect((await db.habitDays.get("2026-09-04"))?.done).toEqual(["water"]); // others still pulled
    expect(await db.outbox.count()).toBe(1); // still queued for the next attempt
  });
});

describe("settings sync and the reading bookmark", () => {
  const cloudSettings = { unit: "kg", weekly_goal_kg: 0.5, default_rest_sec: 210, reminders_enabled: true, no_phone_time: "21:30", sleep_time: "22:00", seeded: true, display_name: "", avatar_data_url: null };
  const local = { id: "app" as const, unit: "kg" as const, weeklyGoalKg: 0.5, defaultRestSec: 210, remindersEnabled: true, noPhoneTime: "21:30", sleepTime: "22:00", seeded: true };

  it("a pull doesn't erase a bookmark the cloud never received, and queues it for upload", async () => {
    await db.settings.put({ ...local, readingProgress: { abbrev: "jo", chapter: 5 } });
    remote.settings = [{ ...cloudSettings, reading_abbrev: null, reading_chapter: null }];

    await fullSync(U);

    expect((await db.settings.get("app"))?.readingProgress).toEqual({ abbrev: "jo", chapter: 5 });
    // Queued for upload (delivered by the normal outbox flush once signed in).
    const queued = await db.outbox.where("table").equals("settings").toArray();
    expect(queued).toHaveLength(1);
    expect(queued[0].payload).toMatchObject({ reading_abbrev: "jo", reading_chapter: 5 });
  });

  it("still takes a newer bookmark from the cloud", async () => {
    await db.settings.put({ ...local, readingProgress: { abbrev: "jo", chapter: 5 } });
    remote.settings = [{ ...cloudSettings, reading_abbrev: "sal", reading_chapter: 23 }];

    await fullSync(U);

    expect((await db.settings.get("app"))?.readingProgress).toEqual({ abbrev: "sal", chapter: 23 });
  });
});
