import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The cloud client is swapped per test: null (not configured) or a stub that reports some rows. */
const cloud = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return cloud.client;
  },
  supabaseConfigured: true,
}));

const { db } = await import("../db");
const { seedIfNeeded } = await import("../seed");
const { isRestoring, checkCloud, pendingChanges, restoreFromCloud } = await import("../restore");

const cloudWith = (sets: number, days: number) => ({
  auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
  from: (table: string) => ({ select: async () => ({ count: table === "sets" ? sets : days, error: null }) }),
});
const queueChange = (key: string) => db.outbox.add({ table: "sets", key, op: "upsert", userId: "u1", payload: { key }, createdAt: Date.now(), attempts: 0 });

beforeEach(async () => {
  localStorage.clear();
  cloud.client = null;
  await Promise.all([db.habitDefs.clear(), db.sets.clear(), db.habitDays.clear(), db.weights.clear(), db.moureWeeks.clear(), db.settings.clear(), db.outbox.clear()]);
});
afterEach(() => vi.restoreAllMocks());

describe("restoring from the cloud", () => {
  it("is off by default and on when the flag is set", () => {
    expect(isRestoring()).toBe(false);
    localStorage.setItem("performance_restore_from_cloud", "1");
    expect(isRestoring()).toBe(true);
  });

  it("seeds nothing while restoring, so demo rows can't be pushed up as duplicates", async () => {
    localStorage.setItem("performance_restore_from_cloud", "1");
    await seedIfNeeded();
    expect(await db.habitDefs.count()).toBe(0);
    expect(await db.sets.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
  });

  it("seeds a fresh install as usual otherwise", async () => {
    await seedIfNeeded();
    expect(await db.habitDefs.count()).toBeGreaterThan(0);
    expect(await db.sets.count()).toBeGreaterThan(0);
  });

  it("can't check a cloud that isn't configured, and says so", async () => {
    const r = await checkCloud();
    expect(r.ok).toBe(false);
  });
});

describe("restoring with changes that haven't been uploaded", () => {
  it("counts the outbox, and says null (unknown) when it can't be read", async () => {
    expect(await pendingChanges()).toBe(0);
    await queueChange("s1");
    await queueChange("s2");
    expect(await pendingChanges()).toBe(2);
    vi.spyOn(db.outbox, "count").mockRejectedValue(Object.assign(new Error("Unable to open cursor"), { name: "UnknownError" }));
    expect(await pendingChanges()).toBeNull();
  });

  it("checkCloud reports how many local changes would be lost", async () => {
    cloud.client = cloudWith(670, 40);
    expect(await checkCloud()).toEqual({ ok: true, sets: 670, days: 40, pending: 0 });
    await queueChange("s1");
    expect(await checkCloud()).toMatchObject({ ok: true, pending: 1 });
    vi.spyOn(db.outbox, "count").mockRejectedValue(new Error("x"));
    expect(await checkCloud()).toMatchObject({ ok: true, pending: null });
  });

  it("restoreFromCloud refuses while changes are pending, and wipes nothing", async () => {
    await queueChange("s1");
    await queueChange("s2");
    const del = vi.spyOn(Dexie, "delete");
    await expect(restoreFromCloud()).rejects.toThrow(/Tienes 2 cambios sin subir; se perderían/);
    expect(del).not.toHaveBeenCalled();
    expect(isRestoring()).toBe(false);
  });

  it("refuses too when it can't tell whether there are pending changes", async () => {
    vi.spyOn(db.outbox, "count").mockRejectedValue(new Error("x"));
    const del = vi.spyOn(Dexie, "delete");
    await expect(restoreFromCloud()).rejects.toThrow(/No pude comprobar/);
    expect(del).not.toHaveBeenCalled();
  });

  it("goes ahead when nothing is pending or when forced", async () => {
    const reload = vi.fn();
    const realLocation = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: { ...realLocation, reload } });
    vi.spyOn(db, "close").mockImplementation(() => {});
    const del = vi.spyOn(Dexie, "delete").mockResolvedValue(undefined);
    try {
      await restoreFromCloud();
      expect(del).toHaveBeenCalledTimes(1);
      expect(reload).toHaveBeenCalledTimes(1);

      await queueChange("s1");
      await restoreFromCloud({ force: true });
      expect(del).toHaveBeenCalledTimes(2);
      expect(reload).toHaveBeenCalledTimes(2);
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: realLocation });
    }
  });
});
