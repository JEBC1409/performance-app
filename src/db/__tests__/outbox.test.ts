import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db";
import type { OutboxRecord } from "../db";
import { enqueue, flushOutbox, pendingKeys, isNetworkError } from "../outbox";
import type { Executor } from "../outbox";

const U = "user-1";
const up = (table: string, key: string, extra: Record<string, unknown> = {}) => ({ table, key, op: "upsert" as const, userId: U, payload: { key, ...extra } });

beforeEach(async () => {
  await db.outbox.clear();
});

describe("outbox", () => {
  it("keeps one entry per row — the newest write wins", async () => {
    await enqueue(up("habit_days", "2026-09-05", { done: ["a"] }));
    await enqueue(up("habit_days", "2026-09-05", { done: ["a", "b"] }));
    await enqueue(up("habit_days", "2026-09-06"));
    const rows = await db.outbox.toArray();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.key === "2026-09-05")?.payload).toEqual({ key: "2026-09-05", done: ["a", "b"] });
  });

  it("a later delete replaces a queued upsert of the same row", async () => {
    await enqueue(up("weights", "w1"));
    await enqueue({ table: "weights", key: "w1", op: "delete", userId: U, match: { id: "w1" } });
    const rows = await db.outbox.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].op).toBe("delete");
  });

  it("delivers in order and empties the queue", async () => {
    await enqueue(up("sets", "s1"));
    await enqueue(up("sets", "s2"));
    const seen: string[] = [];
    const exec: Executor = async (e) => {
      seen.push(e.key);
      return { error: null };
    };
    const res = await flushOutbox(U, exec);
    expect(seen).toEqual(["s1", "s2"]);
    expect(res).toMatchObject({ sent: 2, failed: 0, offline: false });
    expect(await db.outbox.count()).toBe(0);
  });

  it("stops at a network failure and keeps everything from there on queued", async () => {
    await enqueue(up("sets", "s1"));
    await enqueue(up("sets", "s2"));
    await enqueue(up("sets", "s3"));
    let calls = 0;
    const exec: Executor = async () => {
      calls++;
      return calls === 1 ? { error: null } : { error: { message: "TypeError: Failed to fetch" } };
    };
    const res = await flushOutbox(U, exec);
    expect(res).toMatchObject({ sent: 1, offline: true });
    expect(calls).toBe(2);
    expect((await db.outbox.toArray()).map((r) => r.key)).toEqual(["s2", "s3"]);

    // Connection is back: the rest goes through.
    const res2 = await flushOutbox(U, async () => ({ error: null }));
    expect(res2.sent).toBe(2);
    expect(await db.outbox.count()).toBe(0);
  });

  it("a server-side error on one row doesn't block the rows behind it", async () => {
    await enqueue(up("focus_sessions", "f1"));
    await enqueue(up("sets", "s1"));
    const exec: Executor = async (e) => (e.table === "focus_sessions" ? { error: { message: 'relation "focus_sessions" does not exist' } } : { error: null });
    const res = await flushOutbox(U, exec);
    expect(res).toMatchObject({ sent: 1, failed: 1, offline: false });
    const left = await db.outbox.toArray();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ key: "f1", attempts: 1 });
    expect(left[0].lastError).toMatch(/does not exist/);
  });

  it("also delivers writes queued while a flush is running", async () => {
    await enqueue(up("sets", "s1"));
    const seen: string[] = [];
    const exec: Executor = async (e) => {
      seen.push(e.key);
      if (e.key === "s1") await enqueue(up("sets", "s2"));
      return { error: null };
    };
    await flushOutbox(U, exec);
    expect(seen).toEqual(["s1", "s2"]);
    expect(await db.outbox.count()).toBe(0);
  });

  it("only touches the signed-in user's entries", async () => {
    await enqueue(up("sets", "mine"));
    await enqueue({ ...up("sets", "theirs"), userId: "user-2" });
    const exec = vi.fn<Executor>().mockResolvedValue({ error: null });
    await flushOutbox(U, exec);
    expect(exec).toHaveBeenCalledTimes(1);
    expect((await db.outbox.toArray()).map((r: OutboxRecord) => r.key)).toEqual(["theirs"]);
  });

  it("reports pending keys per table", async () => {
    await enqueue(up("habit_days", "2026-09-05"));
    await enqueue({ table: "habit_days", key: "2026-09-06", op: "delete", userId: U, match: { date: "2026-09-06" } });
    await enqueue(up("sets", "s1"));
    const keys = await pendingKeys("habit_days", U);
    expect([...keys.entries()].sort()).toEqual([
      ["2026-09-05", "upsert"],
      ["2026-09-06", "delete"],
    ]);
  });

  it("recognises network failures but not server errors", () => {
    expect(isNetworkError("TypeError: Failed to fetch")).toBe(true);
    expect(isNetworkError("NetworkError when attempting to fetch resource.")).toBe(true);
    expect(isNetworkError("Load failed")).toBe(true);
    expect(isNetworkError('new row violates row-level security policy for table "sets"')).toBe(false);
  });
});
