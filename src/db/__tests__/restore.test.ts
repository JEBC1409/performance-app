import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

const { db } = await import("../db");
const { seedIfNeeded } = await import("../seed");
const { isRestoring, checkCloud } = await import("../restore");

beforeEach(async () => {
  localStorage.clear();
  await Promise.all([db.habitDefs.clear(), db.sets.clear(), db.habitDays.clear(), db.weights.clear(), db.moureWeeks.clear(), db.settings.clear()]);
});

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
