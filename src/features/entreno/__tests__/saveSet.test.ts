import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/db";
import { addSetWithNextIndex } from "@/db/setsWrite";
import { guardedSave } from "../saveSet";

const row = (extra: Record<string, unknown> = {}) => ({ date: "2026-09-05", day: "A" as const, exercise: "Press", weight: 60, reps: 8, toFailure: null, rpe: null, note: "", createdAt: Date.now(), ...extra });

beforeEach(async () => {
  await db.sets.clear();
});

describe("addSetWithNextIndex", () => {
  it("numbers sets 1, 2, 3 per exercise and day", async () => {
    expect(await addSetWithNextIndex(row())).toBe(1);
    expect(await addSetWithNextIndex(row())).toBe(2);
    expect(await addSetWithNextIndex(row({ exercise: "Remo" }))).toBe(1);
    expect(await addSetWithNextIndex(row({ date: "2026-09-06" }))).toBe(1);
    expect(await addSetWithNextIndex(row({ day: "B" }))).toBe(1);
    expect(await addSetWithNextIndex(row())).toBe(3);
  });

  it("two simultaneous saves get different indexes (the count is read inside the transaction)", async () => {
    const [a, b, c] = await Promise.all([addSetWithNextIndex(row()), addSetWithNextIndex(row()), addSetWithNextIndex(row())]);
    expect([a, b, c].sort()).toEqual([1, 2, 3]);
    expect((await db.sets.toArray()).map((s) => s.setIndex).sort()).toEqual([1, 2, 3]);
  });

  it("doesn't collide after a set was deleted from the middle", async () => {
    await addSetWithNextIndex(row());
    await addSetWithNextIndex(row());
    await addSetWithNextIndex(row());
    const second = (await db.sets.toArray()).find((s) => s.setIndex === 2)!;
    await db.sets.delete(second.id!);
    expect(await addSetWithNextIndex(row())).toBe(4);
  });
});

describe("guardedSave", () => {
  it("returns the value and releases the flag", async () => {
    const guard = { current: false };
    expect(await guardedSave(guard, async () => 7)).toEqual({ status: "ok", value: 7 });
    expect(guard.current).toBe(false);
  });

  it("ignores a second call while the first is still saving", async () => {
    const guard = { current: false };
    let release: () => void = () => {};
    const write = vi.fn(() => new Promise<string>((res) => (release = () => res("saved"))));
    const first = guardedSave(guard, write);
    const second = await guardedSave(guard, write);
    expect(second).toEqual({ status: "busy" });
    expect(write).toHaveBeenCalledTimes(1);
    release();
    expect(await first).toEqual({ status: "ok", value: "saved" });
    // and once it's done, saving works again
    expect((await guardedSave(guard, async () => "again")).status).toBe("ok");
  });

  it("reports a failure instead of throwing, and lets the user retry", async () => {
    const guard = { current: false };
    const boom = new Error("Unable to open cursor");
    const res = await guardedSave(guard, async () => {
      throw boom;
    });
    expect(res).toEqual({ status: "error", error: boom });
    expect(guard.current).toBe(false);
    expect((await guardedSave(guard, async () => 1)).status).toBe("ok");
  });

  it("a failing database write surfaces as an error outcome and stores nothing", async () => {
    const spy = vi.spyOn(db.sets, "add").mockRejectedValue(new Error("quota"));
    const res = await guardedSave({ current: false }, () => addSetWithNextIndex(row()));
    expect(res.status).toBe("error");
    spy.mockRestore();
    expect(await db.sets.count()).toBe(0);
  });
});
