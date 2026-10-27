import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db";
import { enqueue, flushOutbox, isMissingColumn, isMissingTable, pendingCount, pendingKeys, readableSyncError, retryDelayMs } from "../outbox";
import type { Executor } from "../outbox";

const U = "user-1";
const up = (table: string, key: string) => ({ table, key, op: "upsert" as const, userId: U, payload: { key } });

beforeEach(async () => {
  await db.outbox.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** What some iPhones do: any cursor request fails with UnknownError. */
function breakCursors() {
  const fail = () => {
    throw Object.assign(new Error("UnknownError: Unable to open cursor"), { name: "UnknownError" });
  };
  vi.spyOn(IDBObjectStore.prototype, "openCursor").mockImplementation(fail);
  vi.spyOn(IDBObjectStore.prototype, "openKeyCursor").mockImplementation(fail);
  vi.spyOn(IDBIndex.prototype, "openCursor").mockImplementation(fail);
  vi.spyOn(IDBIndex.prototype, "openKeyCursor").mockImplementation(fail);
}

describe("outbox without cursors (iPhone 'Unable to open cursor')", () => {
  it("queues, replaces, reads pending keys and flushes in order", async () => {
    breakCursors();
    // Sanity: the simulation really breaks cursor-based reads (what the old outbox used).
    await expect(db.outbox.filter(() => true).toArray()).rejects.toBeTruthy();
    await enqueue(up("sets", "s1"));
    await enqueue({ ...up("sets", "s1"), payload: { key: "s1", v: 2 } }); // replaces the first
    await enqueue(up("sets", "s2"));
    await enqueue({ table: "weights", key: "w1", op: "delete", userId: U, match: { id: "w1" } });

    expect(await db.outbox.count()).toBe(3);
    expect(await pendingCount()).toBe(3);
    expect([...(await pendingKeys("sets", U)).keys()].sort()).toEqual(["s1", "s2"]);

    const seen: string[] = [];
    const exec: Executor = async (e) => {
      seen.push(`${e.table}:${e.key}`);
      return { error: null };
    };
    const res = await flushOutbox(U, exec);
    expect(seen).toEqual(["sets:s1", "sets:s2", "weights:w1"]);
    expect(res).toMatchObject({ sent: 3, failed: 0, offline: false });
    expect(await db.outbox.count()).toBe(0);
  });

  it("records a failure on the entry (update) without a cursor", async () => {
    await enqueue(up("sets", "s1"));
    breakCursors();
    const res = await flushOutbox(U, async () => ({ error: { message: "boom" } }));
    expect(res).toMatchObject({ failed: 1, lastError: "boom" });
    expect(await db.outbox.toArray()).toMatchObject([{ key: "s1", attempts: 1, lastError: "boom" }]);
  });

  it("pendingCount is null (not a throw) when the queue can't be read", async () => {
    vi.spyOn(db.outbox, "count").mockRejectedValue(new Error("UnknownError"));
    expect(await pendingCount()).toBeNull();
  });
});

describe("missing table vs missing column", () => {
  const COLUMN = "Could not find the 'reading_verse' column of 'settings' in the schema cache";
  const TABLE = "Could not find the table 'public.habit_defs' in the schema cache";

  it("tells them apart", () => {
    expect(isMissingColumn(COLUMN)).toBe(true);
    expect(isMissingTable(COLUMN)).toBe(false);
    expect(isMissingColumn('column "done" of relation "habit_days" does not exist')).toBe(true);
    expect(isMissingTable('column "done" of relation "habit_days" does not exist')).toBe(false);
    expect(isMissingTable(TABLE)).toBe(true);
    expect(isMissingColumn(TABLE)).toBe(false);
    expect(isMissingTable('relation "focus_sessions" does not exist')).toBe(true);
  });

  it("explains a missing column in Spanish and leaves other messages alone", () => {
    expect(readableSyncError(COLUMN)).toBe("Falta aplicar una migración en la base: settings.reading_verse");
    expect(readableSyncError("new row violates row-level security policy")).toBe("new row violates row-level security policy");
  });

  it("surfaces a missing column as a sync error but keeps a missing table quiet", async () => {
    await enqueue(up("settings", "app"));
    const res = await flushOutbox(U, async () => ({ error: { message: COLUMN } }));
    expect(res.lastError).toBe("Falta aplicar una migración en la base: settings.reading_verse");

    await db.outbox.clear();
    await enqueue(up("habit_defs", "k"));
    const res2 = await flushOutbox(U, async () => ({ error: { message: TABLE } }));
    expect(res2).toMatchObject({ failed: 1, lastError: null });
  });
});

describe("retry back-off", () => {
  it("doubles from 30 s up to 15 min", () => {
    expect(retryDelayMs(0)).toBe(0);
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(3)).toBe(120_000);
    expect(retryDelayMs(6)).toBe(15 * 60_000);
    expect(retryDelayMs(50)).toBe(15 * 60_000);
  });

  it("leaves a failing entry alone until its delay has passed, never drops it, and a forced flush ignores the delay", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T10:00:00Z"));
    await enqueue(up("sets", "bad"));
    await enqueue(up("sets", "good"));
    let badCalls = 0;
    const exec: Executor = async (e) => {
      if (e.key === "bad") {
        badCalls++;
        return { error: { message: "permission denied" } };
      }
      return { error: null };
    };

    const r1 = await flushOutbox(U, exec);
    expect(r1).toMatchObject({ sent: 1, failed: 1, deferred: 0, lastError: "permission denied" });
    expect(badCalls).toBe(1);

    // 10 s later: still waiting (30 s), not retried, but the error stays visible.
    vi.setSystemTime(new Date("2026-10-01T10:00:10Z"));
    const r2 = await flushOutbox(U, exec);
    expect(badCalls).toBe(1);
    expect(r2).toMatchObject({ sent: 0, failed: 0, deferred: 1, lastError: "permission denied" });

    // A forced flush (the retry button) tries right away.
    await flushOutbox(U, exec, { force: true });
    expect(badCalls).toBe(2);

    // After 2 failures the wait is 60 s.
    vi.setSystemTime(new Date("2026-10-01T10:00:50Z"));
    await flushOutbox(U, exec);
    expect(badCalls).toBe(2);
    vi.setSystemTime(new Date("2026-10-01T10:01:30Z"));
    await flushOutbox(U, exec);
    expect(badCalls).toBe(3);

    const left = await db.outbox.toArray();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ key: "bad", attempts: 3 });
  });

  it("a fresh edit of the same row starts over with no delay", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T10:00:00Z"));
    await enqueue(up("sets", "bad"));
    const exec = vi.fn<Executor>().mockResolvedValueOnce({ error: { message: "nope" } }).mockResolvedValue({ error: null });
    await flushOutbox(U, exec);
    await enqueue(up("sets", "bad"));
    const res = await flushOutbox(U, exec);
    expect(res.sent).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });
});
