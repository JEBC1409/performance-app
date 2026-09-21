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
      q.maybeSingle = () => Promise.resolve({ data: null, error: null });
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
  await Promise.all([db.habitDays.clear(), db.outbox.clear()]);
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
