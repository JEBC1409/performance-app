import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

const { db } = await import("../db");
const { distinctDates, firstByIndex, lastByIndex, newestFirst } = await import("../safeQuery");

beforeEach(async () => {
  await db.weights.clear();
  await db.weights.bulkAdd([
    { date: "2026-10-03", weightKg: 73, pechoCm: null, brazoCm: null, note: "" },
    { date: "2026-10-01", weightKg: 72, pechoCm: null, brazoCm: null, note: "" },
    { date: "2026-10-03", weightKg: 73.5, pechoCm: null, brazoCm: null, note: "" },
    { date: "2026-10-02", weightKg: 72.5, pechoCm: null, brazoCm: null, note: "" },
  ]);
});

describe("safeQuery, when the cursors work", () => {
  it("gives distinct dates, first, last and newest-first", async () => {
    expect(await distinctDates(db.weights.orderBy("date"))).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect((await firstByIndex(db.weights, "date"))?.date).toBe("2026-10-01");
    expect((await lastByIndex(db.weights, "date"))?.date).toBe("2026-10-03");
    expect((await newestFirst(db.weights, "date", 2)).map((r) => r.date)).toEqual(["2026-10-03", "2026-10-03"]);
  });
});

describe("safeQuery, when the phone refuses the cursor", () => {
  // Same table, but any cursor-style call fails the way the phone's IndexedDB does.
  const refuse = () => Promise.reject(Object.assign(new Error("Unable to open cursor"), { name: "UnknownError" }));
  const brokenCollection = (c: ReturnType<typeof db.weights.orderBy>) => {
    const fake = Object.create(c) as ReturnType<typeof db.weights.orderBy>;
    fake.uniqueKeys = refuse as never;
    return fake;
  };
  const brokenTable = () => {
    const fake = Object.create(db.weights) as typeof db.weights;
    fake.orderBy = (() => ({ first: refuse, last: refuse, reverse: () => ({ limit: () => ({ toArray: refuse }), toArray: refuse }) })) as never;
    return fake;
  };

  it("still gives the same answers from a plain read", async () => {
    expect(await distinctDates(brokenCollection(db.weights.orderBy("date")))).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect((await firstByIndex(brokenTable(), "date"))?.date).toBe("2026-10-01");
    expect((await lastByIndex(brokenTable(), "date"))?.date).toBe("2026-10-03");
    expect((await newestFirst(brokenTable(), "date", 2)).map((r) => r.date)).toEqual(["2026-10-03", "2026-10-03"]);
    expect(await newestFirst(brokenTable(), "date")).toHaveLength(4);
  });
});
